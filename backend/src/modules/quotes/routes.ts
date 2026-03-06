// src/modules/quotes/routes.ts
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";
import { newId } from "../../lib/ids.js";
import { getUsageCents } from "../../lib/usage.js";
import { LIMITS } from "../../policy/limits.js";

export const quoteRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", async (req: any, reply) => {
    const body = z
      .object({
        giftCardId: z.string(),
        balanceUsd: z.number().int().positive(), // cents
      })
      .parse(req.body);

    // Per-conversion min/max
    if (body.balanceUsd < LIMITS.perConversionMinCents) {
      return reply.code(400).send({
        error: "AMOUNT_BELOW_MIN",
        minCents: LIMITS.perConversionMinCents,
      });
    }

    if (body.balanceUsd > LIMITS.perConversionMaxCents) {
      return reply.code(400).send({
        error: "AMOUNT_ABOVE_MAX",
        maxCents: LIMITS.perConversionMaxCents,
      });
    }

    // Verify gift card belongs to the user
    const gc = await prisma.giftCard.findFirst({
      where: { id: body.giftCardId, userId: req.user.id },
      select: { id: true },
    });
    if (!gc) return reply.code(404).send({ error: "GIFT_CARD_NOT_FOUND" });

    // KYC gate
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { kycStatus: true },
    });
    if (!user) return reply.code(401).send({ error: "UNAUTHORIZED" });

    if (body.balanceUsd > LIMITS.kycRequiredAboveCents && user.kycStatus !== "VERIFIED") {
      return reply.code(403).send({
        error: "KYC_REQUIRED",
        kycRequiredAboveCents: LIMITS.kycRequiredAboveCents,
        kycStatus: user.kycStatus,
      });
    }

    // Daily/weekly caps
    const usage = await getUsageCents(req.user.id);

    if (usage.dailyUsedCents + body.balanceUsd > LIMITS.dailyMaxCents) {
      return reply.code(409).send({
        error: "LIMIT_DAILY_EXCEEDED",
        maxCents: LIMITS.dailyMaxCents,
        usedCents: usage.dailyUsedCents,
        attemptedCents: body.balanceUsd,
      });
    }

    if (usage.weeklyUsedCents + body.balanceUsd > LIMITS.weeklyMaxCents) {
      return reply.code(409).send({
        error: "LIMIT_WEEKLY_EXCEEDED",
        maxCents: LIMITS.weeklyMaxCents,
        usedCents: usage.weeklyUsedCents,
        attemptedCents: body.balanceUsd,
      });
    }

    // ---- Mock pricing (same as your earlier scaffold) ----
    const feeCents = Math.max(199, Math.floor(body.balanceUsd * 0.05)); // 5% min $1.99
    const netUsd = body.balanceUsd - feeCents;

    // Mock rate: 1 USD -> 1.5 XRP (placeholder)
    const rate = 1.5;
    const xrpEstimate = (netUsd / 100) * rate;

    const quote = await prisma.quote.create({
      data: {
        id: newId(),
        userId: req.user.id,
        giftCardId: body.giftCardId,
        balanceUsd: body.balanceUsd,
        feeBreakdown: { feeCents, feeModel: "mock_5_percent_min_199" },
        rate: String(rate) as any,
        xrpEstimate: String(xrpEstimate) as any,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return reply.send({ quote });
  });
};
