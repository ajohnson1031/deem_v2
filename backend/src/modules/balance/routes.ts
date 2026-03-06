// src/modules/balance/routes.ts
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../db/prisma.js";
import { getOrCreateWallet } from "../../lib/wallet.js";
import { dropsToXrpString } from "../../lib/xrp.js";

export const balanceRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (req: any, reply) => {
    const wallet = await getOrCreateWallet(prisma, req.user.id);

    return reply.send({
      wallet: {
        id: wallet.id,
        xrpDrops: wallet.xrpDrops.toString(),
        xrp: dropsToXrpString(wallet.xrpDrops),
      },
    });
  });
};
