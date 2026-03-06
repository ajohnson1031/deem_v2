// src/modules/payouts/routes.ts
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";
import { getDisplayStatus } from "../../lib/displayStatus.js";
import { newId } from "../../lib/ids.js";
import { conversionQueue } from "../../queues/conversionQueue.js";

async function addEvent(conversionId: string, type: string, payload: any) {
  await prisma.conversionEvent.create({
    data: { id: newId(), conversionId, type, payload },
  });
}

function normalizeEvent(e: any) {
  const base = { id: e.id, type: e.type, at: e.createdAt };

  if (e.type === "STATUS_CHANGED") return { ...base, kind: "status", to: e.payload?.to ?? null };
  if (String(e.type).startsWith("STEP_DONE_"))
    return {
      ...base,
      kind: "step",
      step: String(e.type).replace("STEP_DONE_", ""),
      details: e.payload ?? {},
    };
  if (e.type === "PROVIDER_CALL")
    return {
      ...base,
      kind: "provider",
      provider: e.payload?.provider ?? null,
      op: e.payload?.op ?? null,
      result: e.payload?.result ?? null,
      providerRef: e.payload?.providerRef ?? null,
      reason: e.payload?.reason ?? null,
    };
  if (e.type === "LEDGER") return { ...base, kind: "ledger", ...(e.payload ?? {}) };
  if (e.type === "FAILED") return { ...base, kind: "error", reason: e.payload?.reason ?? null };
  if (e.type === "JOB_FAILED")
    return { ...base, kind: "job_error", error: e.payload?.error ?? null };
  if (e.type === "BANK_ATTACHED") return { ...base, kind: "bank", ...(e.payload ?? {}) };
  if (e.type === "WAITING_FOR_BANK") return { ...base, kind: "action", ...(e.payload ?? {}) };

  return { ...base, kind: "misc", payload: e.payload ?? {} };
}

export const payoutsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Attach a bank account to a conversion and trigger/continue processing.
   * Response: { conversion, ui, timeline }
   */
  app.post("/", async (req: any, reply) => {
    const body = z
      .object({
        conversionId: z.string(),
        bankAccountId: z.string(),
      })
      .parse(req.body);

    // Ensure conversion belongs to user
    const conversion = await prisma.conversion.findFirst({
      where: { id: body.conversionId, userId: req.user.id },
      select: { id: true },
    });
    if (!conversion) return reply.code(404).send({ error: "CONVERSION_NOT_FOUND" });

    // Ensure bank account belongs to user
    const bank = await prisma.bankAccount.findFirst({
      where: { id: body.bankAccountId, userId: req.user.id, status: "ACTIVE" },
      select: { id: true },
    });
    if (!bank) return reply.code(404).send({ error: "BANK_ACCOUNT_NOT_FOUND" });

    // Attach bank to conversion
    await prisma.conversion.update({
      where: { id: conversion.id },
      data: { bankAccount: { connect: { id: bank.id } } },
    });

    await addEvent(conversion.id, "BANK_ATTACHED", { bankAccountId: bank.id });

    // Trigger processing (unique jobId so you can safely call multiple times)
    await conversionQueue.add(
      "process",
      { conversionId: conversion.id },
      {
        jobId: `${conversion.id}:payout:${Date.now()}`,
        attempts: 10,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );

    // Return consistent response: conversion + ui + normalized timeline
    const full = await prisma.conversion.findUnique({
      where: { id: conversion.id },
      include: { events: { orderBy: { createdAt: "asc" } } },
    });

    const ui = getDisplayStatus({
      status: full!.status,
      hasBank: Boolean(full!.bankAccountId),
      failureReason: full!.failureReason ?? null,
    });

    return reply.send({
      conversion: full,
      ui,
      timeline: full!.events.map(normalizeEvent),
    });
  });
};
