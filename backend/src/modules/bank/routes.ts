// src/modules/bank/routes.ts
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";
import { newId } from "../../lib/ids.js";

function bankDisplay(provider: string, last4: string | null | undefined) {
  const masked = last4 ? `•••• ${last4}` : null;
  const displayLabel = last4 ? `${provider} ${masked}` : `${provider} bank`;
  return { displayLabel, masked };
}

export const bankRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Start bank linking (mock).
   * Response: { provider, linkToken, expiresInSeconds }
   */
  app.post("/link/start", async (req: any, reply) => {
    const body = z
      .object({
        provider: z.string().default("mock"),
      })
      .parse(req.body ?? {});

    return reply.send({
      provider: body.provider,
      linkToken: `mock_link_${req.user.id}_${Date.now()}`,
      expiresInSeconds: 30 * 60,
    });
  });

  /**
   * Complete bank linking (mock).
   * Response: { bankAccount }
   */
  app.post("/link/complete", async (req: any, reply) => {
    const body = z
      .object({
        provider: z.string().default("mock"),
        providerRef: z.string().optional(),
        last4: z.string().min(4).max(4).optional(),
      })
      .parse(req.body);

    const bank = await prisma.bankAccount.create({
      data: {
        id: newId(),
        provider: body.provider,
        providerRef: body.providerRef ?? `mock_bank_${req.user.id}_${Date.now()}`,
        last4: body.last4 ?? null,
        user: { connect: { id: req.user.id } },
      },
      select: {
        id: true,
        provider: true,
        providerRef: true,
        last4: true,
        status: true,
        createdAt: true,
      },
    });

    const { displayLabel, masked } = bankDisplay(bank.provider, bank.last4);

    return reply.send({
      bankAccount: {
        ...bank,
        displayLabel,
        masked,
      },
    });
  });

  /**
   * List linked bank accounts for UI selection.
   * Response: { accounts }
   */
  app.get("/accounts", async (req: any, reply) => {
    const rows = await prisma.bankAccount.findMany({
      where: { userId: req.user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, provider: true, last4: true, status: true, createdAt: true },
    });

    const accounts = rows.map((a) => {
      const { displayLabel, masked } = bankDisplay(a.provider, a.last4);
      return { ...a, displayLabel, masked };
    });

    return reply.send({ accounts });
  });
};
