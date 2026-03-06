// src/lib/sandbox.ts
import type { AppEnv } from "../config/env.js";

export type SandboxConfig = {
  seed: number;
  delayMinMs: number;
  delayMaxMs: number;
  failRateGiftCardCapture: number;
  failRateCryptoBuy: number;
  failRateCryptoSell: number;
  failRatePayout: number;
  failRateKyc: number;
  buySlippageBpsMax: number;
};

export type SandboxContext = {
  cfg: SandboxConfig;
  rand: () => number; // 0..1
  int: (min: number, max: number) => number; // inclusive
  chance: (p: number) => boolean;
  sleep: (ms: number) => Promise<void>;
  delay: () => Promise<void>;
  idSuffix: () => string;
  slippageBps: () => number; // [-max..+max]
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSandboxConfig(env: AppEnv): SandboxConfig {
  return {
    seed: env.SANDBOX_SEED,
    delayMinMs: env.SANDBOX_DELAY_MIN_MS,
    delayMaxMs: env.SANDBOX_DELAY_MAX_MS,
    failRateGiftCardCapture: env.SANDBOX_FAIL_RATE_GIFTCARD_CAPTURE,
    failRateCryptoBuy: env.SANDBOX_FAIL_RATE_CRYPTO_BUY,
    failRateCryptoSell: env.SANDBOX_FAIL_RATE_CRYPTO_SELL,
    failRatePayout: env.SANDBOX_FAIL_RATE_PAYOUT,
    failRateKyc: env.SANDBOX_FAIL_RATE_KYC,
    buySlippageBpsMax: env.SANDBOX_BUY_SLIPPAGE_BPS_MAX,
  };
}

export function createSandboxContext(cfg: SandboxConfig): SandboxContext {
  const rand = mulberry32(cfg.seed);

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const int = (min: number, max: number) => {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return lo + Math.floor(rand() * (hi - lo + 1));
  };

  const chance = (p: number) => rand() < p;

  const delay = async () => {
    const ms = int(cfg.delayMinMs, cfg.delayMaxMs);
    if (ms > 0) await sleep(ms);
  };

  const idSuffix = () => {
    // short deterministic-ish suffix
    const n = int(100000, 999999);
    return String(n);
  };

  const slippageBps = () => {
    const max = cfg.buySlippageBpsMax;
    if (max <= 0) return 0;
    const magnitude = int(0, max);
    const sign = chance(0.5) ? 1 : -1;
    return sign * magnitude;
  };

  return { cfg, rand, int, chance, sleep, delay, idSuffix, slippageBps };
}
