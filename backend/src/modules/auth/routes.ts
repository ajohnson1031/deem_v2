// src/modules/auth/routes.ts
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";
import { newId } from "../../lib/ids.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Start OTP (mock)
  app.post("/start", async (req) => {
    const body = z
      .object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
      })
      .parse(req.body);

    return { ok: true, channel: body.email ? "email" : "phone" };
  });

  // Verify OTP (mock) -> issue JWT
  app.post("/verify", async (req) => {
    const body = z
      .object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
        code: z.string(),
      })
      .parse(req.body);

    // Build OR conditions without undefined
    const or: Array<{ email: string } | { phone: string }> = [];
    if (body.email) or.push({ email: body.email });
    if (body.phone) or.push({ phone: body.phone });

    if (or.length === 0) {
      // You can choose 400 here, but returning a consistent error helps the app
      return { error: "EMAIL_OR_PHONE_REQUIRED" };
    }

    const existing = await prisma.user.findFirst({
      where: { OR: or },
    });

    const user =
      existing ??
      (await prisma.user.create({
        data: {
          id: newId(),
          // Prisma wants null or omitted, not undefined
          email: body.email ?? null,
          phone: body.phone ?? null,
        },
      }));

    const token = app.jwt.sign({ id: user.id });
    return { token, user: { id: user.id, kycStatus: user.kycStatus } };
  });
};
