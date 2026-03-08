import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";
import { newId } from "../../lib/ids.js";
import { getUsageCents } from "../../lib/usage.js";
import { LIMITS } from "../../policy/limits.js";

function formatUsdFromCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export const quoteRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", async (req: any, reply) => {
    const body = z
      .object({
        giftCardId: z.string(),
        amountCents: z.number().int().positive().optional(),
        balanceUsd: z.number().int().positive().optional(), // backwards-compat alias
      })
      .parse(req.body);

    const requestedAmountCents = body.amountCents ?? body.balanceUsd;

    if (typeof requestedAmountCents !== "number") {
      return reply.code(400).send({
        error: "AMOUNT_REQUIRED",
      });
    }

    if (requestedAmountCents < LIMITS.perConversionMinCents) {
      return reply.code(400).send({
        error: "AMOUNT_BELOW_MIN",
        minCents: LIMITS.perConversionMinCents,
      });
    }

    if (requestedAmountCents > LIMITS.perConversionMaxCents) {
      return reply.code(400).send({
        error: "AMOUNT_ABOVE_MAX",
        maxCents: LIMITS.perConversionMaxCents,
      });
    }

    const gc = await prisma.giftCard.findFirst({
      where: { id: body.giftCardId, userId: req.user.id },
      select: {
        id: true,
        brand: true,
        last4: true,
      },
    });

    if (!gc) {
      return reply.code(404).send({ error: "GIFT_CARD_NOT_FOUND" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { kycStatus: true },
    });

    if (!user) {
      return reply.code(401).send({ error: "UNAUTHORIZED" });
    }

    if (requestedAmountCents > LIMITS.kycRequiredAboveCents && user.kycStatus !== "VERIFIED") {
      return reply.code(403).send({
        error: "KYC_REQUIRED",
        kycRequiredAboveCents: LIMITS.kycRequiredAboveCents,
        kycStatus: user.kycStatus,
      });
    }

    const usage = await getUsageCents(req.user.id);

    if (usage.dailyUsedCents + requestedAmountCents > LIMITS.dailyMaxCents) {
      return reply.code(409).send({
        error: "LIMIT_DAILY_EXCEEDED",
        maxCents: LIMITS.dailyMaxCents,
        usedCents: usage.dailyUsedCents,
        attemptedCents: requestedAmountCents,
      });
    }

    if (usage.weeklyUsedCents + requestedAmountCents > LIMITS.weeklyMaxCents) {
      return reply.code(409).send({
        error: "LIMIT_WEEKLY_EXCEEDED",
        maxCents: LIMITS.weeklyMaxCents,
        usedCents: usage.weeklyUsedCents,
        attemptedCents: requestedAmountCents,
      });
    }

    // Mock quote math
    const feeCents = Math.max(199, Math.floor(requestedAmountCents * 0.05)); // 5% with $1.99 floor
    const netCents = requestedAmountCents - feeCents;

    // Mock rate: 1 USD -> 1.5 XRP
    const rate = 1.5;
    const xrpEstimate = (netCents / 100) * rate;

    const quoteRecord = await prisma.quote.create({
      data: {
        id: newId(),
        userId: req.user.id,
        giftCardId: body.giftCardId,
        balanceUsd: requestedAmountCents,
        feeBreakdown: {
          feeCents,
          feeModel: "mock_5_percent_min_199",
        },
        rate: String(rate) as any,
        xrpEstimate: String(xrpEstimate) as any,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return reply.send({
      quote: {
        id: quoteRecord.id,
        inputCents: requestedAmountCents,
        outputXrp: xrpEstimate,
      },
      ui: {
        subtitle: `Convert ${formatUsdFromCents(
          requestedAmountCents,
        )} from ${gc.brand ?? "gift card"}${gc.last4 ? ` •••• ${gc.last4}` : ""}.`,
        feeLabel: formatUsdFromCents(feeCents),
        rateLabel: `1 USD = ${rate} XRP`,
        totalLabel: `${formatUsdFromCents(netCents)} → ${xrpEstimate.toFixed(2)} XRP`,
      },
    });
  });
};
