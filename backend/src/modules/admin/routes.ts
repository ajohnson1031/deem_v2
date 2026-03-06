// src/modules/admin/routes.ts
import { Queue } from "bullmq";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";
import { requireAdmin } from "../../lib/admin.js";
import { newId } from "../../lib/ids.js";
import { RELIABILITY, WATCHED_STATUSES } from "../../policy/reliability.js";
import { getBullMqConnection } from "../../queues/connection.js";
import { conversionQueue } from "../../queues/conversionQueue.js";

function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60 * 1000);
}

async function addEvent(conversionId: string, type: string, payload: any) {
  await prisma.conversionEvent.create({
    data: { id: newId(), conversionId, type, payload },
  });
}

// Queue registry (so we can query stats by name)
const connection = getBullMqConnection();
const queues = {
  conversion: conversionQueue,
  watchdog: new Queue("watchdog", { connection }),
} as const;

type QueueName = keyof typeof queues;

async function getQueueStats(q: Queue) {
  const counts = await q.getJobCounts("active", "waiting", "delayed", "completed", "failed", "paused");
  // BullMQ also has getWorkers/getSchedulers in newer versions, but counts are most useful.
  return counts;
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // ---- existing: set KYC ----
  app.post("/users/:id/kyc", async (req, reply) => {
    await requireAdmin(req, reply);
    if (reply.sent) return;

    const params = z.object({ id: z.string() }).parse(req.params);
    const body = z
      .object({
        kycStatus: z.enum(["NOT_STARTED", "PENDING", "VERIFIED", "REJECTED"]),
      })
      .parse(req.body);

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { kycStatus: body.kycStatus as any },
      select: { id: true, kycStatus: true },
    });

    return reply.send({ user });
  });

  // ---- existing: list stuck conversions ----
  app.get("/conversions/stuck", async (req, reply) => {
    await requireAdmin(req, reply);
    if (reply.sent) return;

    const query = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }).parse(req.query);

    const ors = WATCHED_STATUSES.map((status) => ({
      status: status as any,
      updatedAt: { lt: minutesAgo(RELIABILITY.stuckMinutes[status]) },
    }));

    const stuck = await prisma.conversion.findMany({
      where: {
        OR: ors as any,
        NOT: { status: { in: ["COMPLETED", "FAILED", "CANCELED"] as any } },
      },
      orderBy: { updatedAt: "asc" },
      take: query.limit,
      select: { id: true, userId: true, status: true, updatedAt: true, createdAt: true, failureReason: true, bankAccountId: true },
    });

    return reply.send({ items: stuck });
  });

  // ---- existing: admin requeue conversion ----
  app.post("/conversions/:id/requeue", async (req, reply) => {
    await requireAdmin(req, reply);
    if (reply.sent) return;

    const params = z.object({ id: z.string() }).parse(req.params);

    const conversion = await prisma.conversion.findUnique({ where: { id: params.id } });
    if (!conversion) return reply.code(404).send({ error: "NOT_FOUND" });

    await addEvent(conversion.id, "ADMIN_REQUEUE", { by: "admin" });

    await conversionQueue.add(
      "process",
      { conversionId: conversion.id },
      {
        jobId: `${conversion.id}:admin:${Date.now()}`,
        attempts: 10,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );

    return reply.send({ ok: true, conversionId: conversion.id });
  });

  // ---- existing: admin force-fail conversion ----
  app.post("/conversions/:id/fail", async (req, reply) => {
    await requireAdmin(req, reply);
    if (reply.sent) return;

    const params = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ reason: z.string().min(3).default("ADMIN_FORCE_FAIL") }).parse(req.body ?? {});

    const conversion = await prisma.conversion.findUnique({ where: { id: params.id } });
    if (!conversion) return reply.code(404).send({ error: "NOT_FOUND" });

    await prisma.conversion.update({
      where: { id: conversion.id },
      data: { status: "FAILED", failureReason: body.reason },
    });

    await addEvent(conversion.id, "FAILED", { reason: body.reason });

    return reply.send({ ok: true, conversionId: conversion.id });
  });

  // ============================================================
  // 🧰 NEW: Queue health endpoints
  // ============================================================

  /**
   * GET /admin/queues
   * Returns job counts for each queue.
   */
  app.get("/queues", async (req, reply) => {
    await requireAdmin(req, reply);
    if (reply.sent) return;

    const [conversionCounts, watchdogCounts] = await Promise.all([getQueueStats(queues.conversion), getQueueStats(queues.watchdog)]);

    return reply.send({
      queues: {
        conversion: conversionCounts,
        watchdog: watchdogCounts,
      },
    });
  });

  /**
   * GET /admin/queues/:name/jobs?state=failed&limit=20
   * Lists jobs for a queue by state.
   */
  app.get("/queues/:name/jobs", async (req, reply) => {
    await requireAdmin(req, reply);
    if (reply.sent) return;

    const params = z.object({ name: z.enum(["conversion", "watchdog"]) }).parse(req.params);
    const query = z
      .object({
        state: z.enum(["active", "waiting", "delayed", "completed", "failed", "paused"]).default("failed"),
        limit: z.coerce.number().int().min(1).max(200).default(20),
      })
      .parse(req.query);

    const q: Queue = queues[params.name as QueueName];

    // BullMQ uses ranges; pull the most recent jobs
    const jobs = await q.getJobs([query.state], 0, query.limit - 1, true);

    return reply.send({
      queue: params.name,
      state: query.state,
      items: jobs.map((j) => ({
        id: j.id,
        name: j.name,
        data: j.data,
        opts: j.opts,
        attemptsMade: j.attemptsMade,
        failedReason: (j as any).failedReason ?? null,
        processedOn: j.processedOn ?? null,
        finishedOn: j.finishedOn ?? null,
        timestamp: j.timestamp ?? null,
      })),
    });
  });

  /**
   * POST /admin/queues/:name/retry-failed
   * Retries all failed jobs in the queue (admin-only, use carefully).
   */
  app.post("/queues/:name/retry-failed", async (req, reply) => {
    await requireAdmin(req, reply);
    if (reply.sent) return;

    const params = z.object({ name: z.enum(["conversion", "watchdog"]) }).parse(req.params);
    const q: Queue = queues[params.name as QueueName];

    const failed = await q.getJobs(["failed"], 0, 500, true);
    let retried = 0;

    for (const job of failed) {
      try {
        await job.retry();
        retried += 1;
      } catch {
        // ignore per-job errors; report aggregate
      }
    }

    return reply.send({ ok: true, queue: params.name, retried });
  });
};
