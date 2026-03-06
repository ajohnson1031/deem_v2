// src/modules/activity/routes.ts
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { getDisplayStatus } from "../../lib/displayStatus.js";

function money(cents: number) {
  return { cents, currency: "USD" as const };
}

function summarizeConversion(c: any) {
  const hasBank = Boolean(c.bankAccountId) || Boolean(c.bankAccount);
  const ui = getDisplayStatus({ status: c.status, hasBank, failureReason: c.failureReason ?? null });

  return {
    id: c.id,
    status: c.status,

    ...ui,

    createdAt: c.createdAt,
    updatedAt: c.updatedAt,

    sourceAmount: money(c.sourceAmountUsd),
    fees: money(c.feesUsd),
    netAmount: money(c.sourceAmountUsd - c.feesUsd),
    xrpAmount: c.xrpAmount ?? null,

    giftCard: c.giftCard ? { id: c.giftCard.id, brand: c.giftCard.brand ?? null, last4: c.giftCard.last4 ?? null, type: c.giftCard.type } : null,

    bankAccount: c.bankAccount ? { id: c.bankAccount.id, provider: c.bankAccount.provider, last4: c.bankAccount.last4 ?? null } : null,

    failureReason: c.failureReason ?? null,
  };
}

export const activityRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (req: any, reply) => {
    const query = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(25),
        cursor: z.string().optional(),
      })
      .parse(req.query);

    const items = await prisma.conversion.findMany({
      where: { userId: req.user.id },
      take: query.limit + 1,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        giftCard: { select: { id: true, brand: true, last4: true, type: true } },
        bankAccount: { select: { id: true, provider: true, last4: true } },
      },
    });

    const hasNext = items.length > query.limit;
    const page = hasNext ? items.slice(0, query.limit) : items;
    const nextCursor = hasNext ? page[page.length - 1]?.id : null;

    return reply.send({ items: page.map(summarizeConversion), nextCursor });
  });
};
