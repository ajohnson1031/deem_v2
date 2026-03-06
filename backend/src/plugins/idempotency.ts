import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { sha256 } from "../lib/hash.js";

export const idempotencyPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (req, reply) => {
    const key = req.headers["idempotency-key"];
    if (!key || typeof key !== "string") return;

    // You can also scope to only POST routes if you want
    const userId = (req as any).user?.id ?? "anonymous";
    const route = `${req.method} ${req.url}`;
    const requestHash = sha256(JSON.stringify(req.body ?? {}));

    const existing = await prisma.idempotencyKey.findUnique({ where: { key } });
    if (existing) {
      // Same key but different request body should be rejected
      if (existing.requestHash !== requestHash) {
        reply.code(409).send({ error: "IDEMPOTENCY_KEY_REUSE_WITH_DIFFERENT_BODY" });
        return reply;
      }
      return reply.send(existing.response);
    }

    // Store context on request for postHandler to save the response
    (req as any)._idem = { key, userId, route, requestHash };
  });

  app.addHook("onSend", async (req, _reply, payload) => {
    const idem = (req as any)._idem;
    if (!idem) return;

    // Fastify may pass payload as string/buffer
    let responseJson: any;
    try {
      responseJson = typeof payload === "string" ? JSON.parse(payload) : payload;
    } catch {
      responseJson = { raw: String(payload) };
    }

    await prisma.idempotencyKey.create({
      data: {
        key: idem.key,
        userId: idem.userId,
        route: idem.route,
        requestHash: idem.requestHash,
        response: responseJson,
      },
    });
  });
};
