import "../bootstrap/env.ts";
import type { ConnectionOptions } from "bullmq";
import { Job, Queue, Worker } from "bullmq";

import { prisma } from "../db/prisma.js";
import { newId } from "../lib/ids.js";
import { RELIABILITY, WATCHED_STATUSES } from "../policy/reliability.js";
import { getBullMqConnection } from "../queues/connection.js";
import { conversionQueue } from "../queues/conversionQueue.js";

type WatchdogJobData = { runId: string };

const WATCHDOG_QUEUE_NAME = "watchdog";

function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60 * 1000);
}

async function addEvent(conversionId: string, type: string, payload: any) {
  await prisma.conversionEvent.create({
    data: { id: newId(), conversionId, type, payload },
  });
}

async function countWatchdogRequeues(conversionId: string) {
  return prisma.conversionEvent.count({
    where: { conversionId, type: "WATCHDOG_REQUEUE" },
  });
}

async function failConversion(conversionId: string, reason: string) {
  await prisma.conversion.update({
    where: { id: conversionId },
    data: { status: "FAILED", failureReason: reason },
  });
  await addEvent(conversionId, "FAILED", { reason });
}

async function watchdogSweep() {
  // Build OR clauses per status with its own threshold.
  const ors = WATCHED_STATUSES.map((status) => ({
    status: status as any,
    updatedAt: { lt: minutesAgo(RELIABILITY.stuckMinutes[status]) },
  }));

  const stuck = await prisma.conversion.findMany({
    where: {
      OR: ors as any,
      // Don’t touch terminal conversions (defensive)
      NOT: { status: { in: ["COMPLETED", "FAILED", "CANCELED"] as any } },
    },
    select: { id: true, status: true, updatedAt: true, userId: true, bankAccountId: true },
    take: 100, // batch limit per sweep
    orderBy: { updatedAt: "asc" },
  });

  for (const c of stuck) {
    const requeues = await countWatchdogRequeues(c.id);

    if (requeues >= RELIABILITY.maxWatchdogRequeues) {
      await addEvent(c.id, "WATCHDOG_GIVE_UP", {
        status: c.status,
        updatedAt: c.updatedAt,
        requeues,
      });
      await failConversion(c.id, "WATCHDOG_MAX_REQUEUES_EXCEEDED");
      continue;
    }

    await addEvent(c.id, "WATCHDOG_REQUEUE", {
      status: c.status,
      updatedAt: c.updatedAt,
      requeues: requeues + 1,
    });

    // Requeue processing. Unique jobId so multiple requeues can coexist safely.
    await conversionQueue.add(
      "process",
      { conversionId: c.id },
      {
        jobId: `${c.id}:watchdog:${Date.now()}`,
        attempts: 10,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );
  }

  return { scanned: stuck.length };
}

export function startWatchdogWorker(connection: ConnectionOptions = getBullMqConnection()) {
  const watchdogQueue = new Queue(WATCHDOG_QUEUE_NAME, { connection });

  // Ensure repeatable job exists (idempotent)
  void watchdogQueue.add(
    "sweep",
    { runId: "repeat" },
    {
      jobId: "watchdog:sweep",
      repeat: { every: RELIABILITY.watchdogEveryMinutes * 60 * 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  const worker = new Worker<WatchdogJobData>(
    WATCHDOG_QUEUE_NAME,
    async (_job: Job<WatchdogJobData>) => {
      await watchdogSweep();
    },
    { connection, concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    // Logging only — watchdog should not take the system down
    console.error("Watchdog job failed", job?.id, err);
  });

  return worker;
}
