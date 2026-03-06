// src/providers/kyc/index.ts
import type { SandboxContext } from "../../lib/sandbox.js";

export type KycResult = { ok: true } | { ok: false; reason: string };

export interface KycProvider {
  ensureVerified(args: { userId: string }): Promise<KycResult>;
}

// Always-ok mock
export class MockKycProvider implements KycProvider {
  async ensureVerified(_args: { userId: string }): Promise<KycResult> {
    return { ok: true };
  }
}

// Sandbox: delay + occasional outage
export class SandboxKycProvider implements KycProvider {
  constructor(private ctx: SandboxContext) {}

  async ensureVerified(_args: { userId: string }): Promise<KycResult> {
    await this.ctx.delay();

    if (this.ctx.chance(this.ctx.cfg.failRateKyc)) {
      return { ok: false, reason: "SANDBOX_KYC_PROVIDER_UNAVAILABLE" };
    }

    return { ok: true };
  }
}
