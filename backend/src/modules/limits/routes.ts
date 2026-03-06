// src/modules/limits/routes.ts
import type { FastifyPluginAsync } from "fastify";
import { getUsageCents } from "../../lib/usage.js";
import { LIMITS } from "../../policy/limits.js";

export const limitsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (req: any, reply) => {
    const usage = await getUsageCents(req.user.id);

    const dailyRemaining = Math.max(0, LIMITS.dailyMaxCents - usage.dailyUsedCents);
    const weeklyRemaining = Math.max(0, LIMITS.weeklyMaxCents - usage.weeklyUsedCents);

    return reply.send({
      currency: LIMITS.currency,
      kycRequiredAboveCents: LIMITS.kycRequiredAboveCents,
      perConversion: {
        minCents: LIMITS.perConversionMinCents,
        maxCents: LIMITS.perConversionMaxCents,
      },
      daily: {
        maxCents: LIMITS.dailyMaxCents,
        usedCents: usage.dailyUsedCents,
        remainingCents: dailyRemaining,
        windowStartUtc: usage.dayStart,
      },
      weekly: {
        maxCents: LIMITS.weeklyMaxCents,
        usedCents: usage.weeklyUsedCents,
        remainingCents: weeklyRemaining,
        windowStartUtc: usage.weekStart,
      },
      notes: ["Usage computed from conversions in non-failed states."],
    });
  });
};
