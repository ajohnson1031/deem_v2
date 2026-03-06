// src/modules/conversions/routes.ts
import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";
import { requireAdmin } from "../../lib/admin.js";
import { getDisplayStatus } from "../../lib/displayStatus.js";
import { newId } from "../../lib/ids.js";
import { getUsageCents } from "../../lib/usage.js";
import { LIMITS } from "../../policy/limits.js";
import { conversionQueue } from "../../queues/conversionQueue.js";

async function addEvent(conversionId: string, type: string, payload: any) {
  await prisma.conversionEvent.create({
    data: { id: newId(), conversionId, type, payload },
  });
}

function normalizeEvent(e: any) {
  const base = { id: e.id, type: e.type, at: e.createdAt };

  if (e.type === "STATUS_CHANGED") return { ...base, kind: "status", to: e.payload?.to ?? null };
  if (String(e.type).startsWith("STEP_DONE_")) return { ...base, kind: "step", step: String(e.type).replace("STEP_DONE_", ""), details: e.payload ?? {} };
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
  if (e.type === "JOB_FAILED") return { ...base, kind: "job_error", error: e.payload?.error ?? null };
  if (e.type === "BANK_ATTACHED") return { ...base, kind: "bank", ...(e.payload ?? {}) };
  if (e.type === "WAITING_FOR_BANK") return { ...base, kind: "action", ...(e.payload ?? {}) };

  return { ...base, kind: "misc", payload: e.payload ?? {} };
}

export const conversionRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Create a conversion from a quote (fast): DB record + enqueue job.
   * Response: { conversion, ui, timeline }
   */
  app.post("/", async (req: any, reply) => {
    const body = z
      .object({
        quoteId: z.string(),
        bankAccountId: z.string().optional(),
      })
      .parse(req.body);

    const quote = await prisma.quote.findFirst({
      where: { id: body.quoteId, userId: req.user.id },
    });

    if (!quote) return reply.code(404).send({ error: "QUOTE_NOT_FOUND" });
    if (quote.expiresAt.getTime() < Date.now()) return reply.code(409).send({ error: "QUOTE_EXPIRED" });

    // Ensure bankAccount belongs to user if provided
    if (body.bankAccountId) {
      const bank = await prisma.bankAccount.findFirst({
        where: { id: body.bankAccountId, userId: req.user.id },
        select: { id: true },
      });
      if (!bank) return reply.code(404).send({ error: "BANK_ACCOUNT_NOT_FOUND" });
    }

    // Confirm-time KYC re-check (race-proof)
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { kycStatus: true },
    });
    if (!user) return reply.code(401).send({ error: "UNAUTHORIZED" });

    const amount = quote.balanceUsd;

    if (amount > LIMITS.kycRequiredAboveCents && user.kycStatus !== "VERIFIED") {
      return reply.code(403).send({
        error: "KYC_REQUIRED",
        kycRequiredAboveCents: LIMITS.kycRequiredAboveCents,
        kycStatus: user.kycStatus,
      });
    }

    // Confirm-time limits re-check (race-proof)
    const usage = await getUsageCents(req.user.id);
    if (usage.dailyUsedCents + amount > LIMITS.dailyMaxCents) return reply.code(409).send({ error: "LIMIT_DAILY_EXCEEDED" });
    if (usage.weeklyUsedCents + amount > LIMITS.weeklyMaxCents) return reply.code(409).send({ error: "LIMIT_WEEKLY_EXCEEDED" });

    // Fee breakdown stored as JSON
    const feeCents = typeof (quote.feeBreakdown as any)?.feeCents === "number" ? (quote.feeBreakdown as any).feeCents : 0;

    const data: Prisma.ConversionCreateInput = {
      id: newId(),
      user: { connect: { id: req.user.id } },
      giftCard: { connect: { id: quote.giftCardId } },
      quote: { connect: { id: quote.id } },
      sourceAmountUsd: quote.balanceUsd,
      feesUsd: feeCents,
      xrpAmount: quote.xrpEstimate,
      status: "USER_CONFIRMED",
    };

    if (body.bankAccountId) {
      data.bankAccount = { connect: { id: body.bankAccountId } };
    }

    const conversion = await prisma.conversion.create({ data });

    // Seed timeline with the initial status change
    await addEvent(conversion.id, "STATUS_CHANGED", { to: "USER_CONFIRMED" });

    // Re-fetch with events so response matches GET /:id
    const full = await prisma.conversion.findUnique({
      where: { id: conversion.id },
      include: { events: { orderBy: { createdAt: "asc" } } },
    });

    // Enqueue processing job
    await conversionQueue.add(
      "process",
      { conversionId: conversion.id },
      {
        jobId: conversion.id,
        attempts: 10,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );

    const ui = getDisplayStatus({
      status: full!.status,
      hasBank: Boolean(full!.bankAccountId),
      failureReason: full!.failureReason ?? null,
    });

    return reply.code(201).send({
      conversion: full,
      ui,
      timeline: full!.events.map(normalizeEvent),
    });
  });

  /**
   * Get conversion + raw events (debug/internal)
   * Response: { conversion, ui, timeline }
   */
  app.get("/:id", async (req: any, reply) => {
    const params = z.object({ id: z.string() }).parse(req.params);

    const conversion = await prisma.conversion.findFirst({
      where: { id: params.id, userId: req.user.id },
      include: { events: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversion) return reply.code(404).send({ error: "NOT_FOUND" });

    const ui = getDisplayStatus({
      status: conversion.status,
      hasBank: Boolean(conversion.bankAccountId),
      failureReason: conversion.failureReason ?? null,
    });

    return reply.send({
      conversion,
      ui,
      timeline: conversion.events.map(normalizeEvent),
    });
  });

  /**
   * Admin: requeue a conversion job
   */
  app.post("/:id/requeue", async (req: any, reply) => {
    await requireAdmin(req, reply);
    if (reply.sent) return;

    const params = z.object({ id: z.string() }).parse(req.params);

    const conversion = await prisma.conversion.findUnique({ where: { id: params.id } });
    if (!conversion) return reply.code(404).send({ error: "NOT_FOUND" });

    await conversionQueue.add(
      "process",
      { conversionId: conversion.id },
      {
        jobId: conversion.id,
        attempts: 10,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );

    return reply.send({ ok: true, conversionId: conversion.id });
  });

  /**
   * App: normalized timeline endpoint
   * Response: { conversion: { ...moneyFields, ...ui }, timeline }
   */
  app.get("/:id/timeline", async (req: any, reply: any) => {
    const params = z.object({ id: z.string() }).parse(req.params);

    const conversion = await prisma.conversion.findFirst({
      where: { id: params.id, userId: req.user.id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        sourceAmountUsd: true,
        feesUsd: true,
        xrpAmount: true,
        failureReason: true,
        bankAccountId: true,
      },
    });

    if (!conversion) return reply.code(404).send({ error: "NOT_FOUND" });

    const events = await prisma.conversionEvent.findMany({
      where: { conversionId: conversion.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, type: true, payload: true, createdAt: true },
    });

    const ui = getDisplayStatus({
      status: conversion.status,
      hasBank: Boolean(conversion.bankAccountId),
      failureReason: conversion.failureReason ?? null,
    });

    return reply.send({
      conversion: {
        id: conversion.id,
        status: conversion.status,
        ...ui,
        createdAt: conversion.createdAt,
        updatedAt: conversion.updatedAt,
        sourceAmount: { cents: conversion.sourceAmountUsd, currency: "USD" },
        fees: { cents: conversion.feesUsd, currency: "USD" },
        netAmount: { cents: conversion.sourceAmountUsd - conversion.feesUsd, currency: "USD" },
        xrpAmount: conversion.xrpAmount ?? null,
        failureReason: conversion.failureReason ?? null,
      },
      timeline: events.map(normalizeEvent),
    });
  });
};
