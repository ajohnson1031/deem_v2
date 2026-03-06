import "./bootstrap/env.ts";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import Fastify from "fastify";
import { idempotencyPlugin } from "./plugins/idempotency.js";

// Routes
import { activityRoutes } from "./modules/activity/routes.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { balanceRoutes } from "./modules/balance/routes.js";
import { bankRoutes } from "./modules/bank/routes.js";
import { conversionRoutes } from "./modules/conversions/routes.js";
import { giftCardRoutes } from "./modules/giftcards/routes.js";
import { limitsRoutes } from "./modules/limits/routes.js";
import { payoutsRoutes } from "./modules/payouts/routes.js";
import { quoteRoutes } from "./modules/quotes/routes.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

await app.register(jwt, { secret: process.env.JWT_SECRET! });

app.decorate("authenticate", async (req: any, reply: any) => {
  try {
    const payload = await req.jwtVerify();
    req.user = payload;
  } catch {
    reply.code(401).send({ error: "UNAUTHORIZED" });
  }
});

// ✅ Global auth hook (so rate limiting can reliably use req.user.id on protected routes)
app.addHook("preHandler", async (req: any, reply) => {
  const url = req.url ?? "";

  const isPublic =
    url.startsWith("/auth/") ||
    url.startsWith("/docs") ||
    url.startsWith("/health") ||
    url.startsWith("/swagger") || // just in case
    url === "/docs";

  if (isPublic) return;

  await (app as any).authenticate(req, reply);
});

// ✅ Rate limit keyed by userId when available, otherwise IP
await app.register(rateLimit, {
  max: 120,
  timeWindow: "1 minute",

  // ✅ key off userId if auth already ran
  keyGenerator: (req) => {
    const userId = (req as any).user?.id;
    if (typeof userId === "string" && userId.length > 0) return `user:${userId}`;
    return `ip:${req.ip}`;
  },

  // ✅ critical: run rate-limit after auth hook
  hook: "preHandler",
});

await app.register(swagger, {
  openapi: {
    info: { title: "Deem API", version: "0.1.0" },
  },
});
await app.register(swaggerUI, { routePrefix: "/docs" });

await app.register(idempotencyPlugin);

// Mount routes
await app.register(authRoutes, { prefix: "/auth" });
await app.register(giftCardRoutes, { prefix: "/gift-cards" });
await app.register(quoteRoutes, { prefix: "/quotes" });
await app.register(conversionRoutes, { prefix: "/conversions" });
await app.register(bankRoutes, { prefix: "/bank" });
await app.register(activityRoutes, { prefix: "/activity" });
await app.register(limitsRoutes, { prefix: "/limits" });
await app.register(balanceRoutes, { prefix: "/balance" });
await app.register(adminRoutes, { prefix: "/admin" });
await app.register(payoutsRoutes, { prefix: "/payouts" });

app.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });
