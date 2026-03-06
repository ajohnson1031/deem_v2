// src/config/env.ts
import { z } from "zod";
import "../bootstrap/env.ts";

const ProviderName = z.enum(["mock", "sandbox"]);

const EnvSchema = z.object({
  // core runtime
  JWT_SECRET: z.string().min(1),
  DATABASE_URL: z.string().min(1),

  // queues
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  // admin
  ADMIN_API_KEY: z.string().min(1).default("dev_admin_key_change_me"),

  // provider selection
  GIFTCARD_PROVIDER: ProviderName.default("mock"),
  CRYPTO_PROVIDER: ProviderName.default("mock"),
  PAYOUT_PROVIDER: ProviderName.default("mock"),
  KYC_PROVIDER: ProviderName.default("mock"),

  // sandbox behavior
  SANDBOX_SEED: z.coerce.number().int().nonnegative().default(1),
  SANDBOX_DELAY_MIN_MS: z.coerce.number().int().min(0).default(150),
  SANDBOX_DELAY_MAX_MS: z.coerce.number().int().min(0).default(900),

  // failure rates (0..1)
  SANDBOX_FAIL_RATE_GIFTCARD_CAPTURE: z.coerce.number().min(0).max(1).default(0.03),
  SANDBOX_FAIL_RATE_CRYPTO_BUY: z.coerce.number().min(0).max(1).default(0.02),
  SANDBOX_FAIL_RATE_CRYPTO_SELL: z.coerce.number().min(0).max(1).default(0.02),
  SANDBOX_FAIL_RATE_PAYOUT: z.coerce.number().min(0).max(1).default(0.02),
  SANDBOX_FAIL_RATE_KYC: z.coerce.number().min(0).max(1).default(0.01),

  // slippage (basis points, e.g. 30 = 0.30%)
  SANDBOX_BUY_SLIPPAGE_BPS_MAX: z.coerce.number().int().min(0).max(500).default(25),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function getEnv(): AppEnv {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment configuration:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  // normalize delay ordering
  const e = parsed.data;
  if (e.SANDBOX_DELAY_MAX_MS < e.SANDBOX_DELAY_MIN_MS) {
    return { ...e, SANDBOX_DELAY_MAX_MS: e.SANDBOX_DELAY_MIN_MS };
  }
  return e;
}
