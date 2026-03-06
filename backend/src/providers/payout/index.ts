// src/providers/payout/index.ts
import type { SandboxContext } from "../../lib/sandbox.js";

export type PayoutResult = { ok: true; providerRef?: string } | { ok: false; reason: string };

export interface PayoutProvider {
  payoutAch(args: { conversionId: string }): Promise<PayoutResult>;
}

// Always-success mock
export class MockPayoutProvider implements PayoutProvider {
  async payoutAch({ conversionId }: { conversionId: string }): Promise<PayoutResult> {
    return { ok: true, providerRef: `mock_payout_${conversionId}` };
  }
}

// Real-ish sandbox with delay + failure injection
export class SandboxPayoutProvider implements PayoutProvider {
  constructor(private ctx: SandboxContext) {}

  async payoutAch({ conversionId }: { conversionId: string }): Promise<PayoutResult> {
    await this.ctx.delay();

    if (this.ctx.chance(this.ctx.cfg.failRatePayout)) {
      return { ok: false, reason: "SANDBOX_PAYOUT_FAILED" };
    }

    return { ok: true, providerRef: `sb_payout_${conversionId}_${this.ctx.idSuffix()}` };
  }
}
