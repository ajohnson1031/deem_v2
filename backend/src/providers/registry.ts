// src/providers/registry.ts
import type { AppEnv } from "../config/env.js";
import { buildSandboxConfig, createSandboxContext } from "../lib/sandbox.js";

import type { GiftCardProvider } from "./giftcard/index.js";
import { MockGiftCardProvider, SandboxGiftCardProvider } from "./giftcard/index.js";

import type { CryptoProvider } from "./crypto/index.js";
import { MockCryptoProvider, SandboxCryptoProvider } from "./crypto/index.js";

import type { PayoutProvider } from "./payout/index.js";
import { MockPayoutProvider, SandboxPayoutProvider } from "./payout/index.js";

import type { KycProvider } from "./kyc/index.js";
import { MockKycProvider, SandboxKycProvider } from "./kyc/index.js";

export type ProviderRegistry = {
  giftCard: GiftCardProvider;
  crypto: CryptoProvider;
  payout: PayoutProvider;
  kyc: KycProvider;
};

export function buildProviderRegistry(env: AppEnv): ProviderRegistry {
  const sb = createSandboxContext(buildSandboxConfig(env));

  const giftCard: GiftCardProvider =
    env.GIFTCARD_PROVIDER === "sandbox"
      ? new SandboxGiftCardProvider(sb)
      : new MockGiftCardProvider();

  const crypto: CryptoProvider =
    env.CRYPTO_PROVIDER === "sandbox" ? new SandboxCryptoProvider(sb) : new MockCryptoProvider();

  const payout: PayoutProvider =
    env.PAYOUT_PROVIDER === "sandbox" ? new SandboxPayoutProvider(sb) : new MockPayoutProvider();

  const kyc: KycProvider =
    env.KYC_PROVIDER === "sandbox" ? new SandboxKycProvider(sb) : new MockKycProvider();

  return { giftCard, crypto, payout, kyc };
}
