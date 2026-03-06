// src/modules/giftcards/routes.ts
import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";
import { newId } from "../../lib/ids.js";
import { BALANCE_CHECK_LIMITS } from "../../policy/balanceChecks.js";

function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60 * 1000);
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export const giftCardRoutes: FastifyPluginAsync = async (app) => {
  // ✅ No authenticate hook here because server.ts now enforces auth globally

  app.post("/", async (req: any, reply) => {
    const body = z
      .object({
        type: z.enum(["OPEN_LOOP", "STORE"]),
        brand: z.string().optional(),
        last4: z.string().min(4).max(4).optional(),
        tokenRef: z.string().optional(),
      })
      .parse(req.body);

    const data: Prisma.GiftCardCreateInput = {
      id: newId(),
      type: body.type as any,
      tokenRef: body.tokenRef ?? "mock_token_ref",
      user: { connect: { id: req.user.id } },
    };

    // Only include optional fields if present (avoid passing undefined)
    if (body.brand) data.brand = body.brand;
    if (body.last4) data.last4 = body.last4;

    const gc = await prisma.giftCard.create({ data });

    return reply.send({ giftCard: gc });
  });

  app.post(
    "/:id/balance",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (req: any, reply) => {
      const params = z.object({ id: z.string() }).parse(req.params);

      const gc = await prisma.giftCard.findFirst({
        where: { id: params.id, userId: req.user.id },
      });

      if (!gc) return reply.code(404).send({ error: "NOT_FOUND" });

      // --- DB-backed velocity checks ---
      const userId = req.user.id as string;
      const giftCardId = gc.id;

      const [user10m, user1d, card10m, card1d] = await Promise.all([
        prisma.giftCardBalanceCheck.count({ where: { userId, createdAt: { gte: minutesAgo(10) } } }),
        prisma.giftCardBalanceCheck.count({ where: { userId, createdAt: { gte: daysAgo(1) } } }),
        prisma.giftCardBalanceCheck.count({ where: { giftCardId, createdAt: { gte: minutesAgo(10) } } }),
        prisma.giftCardBalanceCheck.count({ where: { giftCardId, createdAt: { gte: daysAgo(1) } } }),
      ]);

      const limits = BALANCE_CHECK_LIMITS;

      const logAnd429 = async (scope: string, reason: string) => {
        await prisma.giftCardBalanceCheck.create({
          data: { id: newId(), user: { connect: { id: userId } }, giftCard: { connect: { id: giftCardId } }, ok: false, reason },
        });
        return reply.code(429).send({ error: "BALANCE_CHECK_RATE_LIMIT", scope });
      };

      if (user10m >= limits.perUserPer10Min) return logAnd429("USER_10MIN", "USER_10MIN_LIMIT");
      if (user1d >= limits.perUserPerDay) return logAnd429("USER_1DAY", "USER_1DAY_LIMIT");
      if (card10m >= limits.perCardPer10Min) return logAnd429("CARD_10MIN", "CARD_10MIN_LIMIT");
      if (card1d >= limits.perCardPerDay) return logAnd429("CARD_1DAY", "CARD_1DAY_LIMIT");

      // --- Mock balance result ---
      const result = { giftCardId: gc.id, balanceUsd: 2500, currency: "USD" as const };

      await prisma.giftCardBalanceCheck.create({
        data: { id: newId(), user: { connect: { id: userId } }, giftCard: { connect: { id: giftCardId } }, ok: true },
      });

      return reply.send(result);
    },
  );
};
