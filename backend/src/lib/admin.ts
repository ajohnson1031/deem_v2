import type { FastifyReply, FastifyRequest } from "fastify";

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const key = req.headers["x-admin-key"];
  if (!process.env.ADMIN_API_KEY) {
    return reply.code(500).send({ error: "ADMIN_API_KEY_NOT_SET" });
  }
  if (typeof key !== "string" || key !== process.env.ADMIN_API_KEY) {
    return reply.code(403).send({ error: "FORBIDDEN" });
  }
}
