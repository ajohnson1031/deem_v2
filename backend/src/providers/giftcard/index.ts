// src/providers/giftcard/index.ts
import type { SandboxContext } from "../../lib/sandbox.js";

export type CaptureValueResult = { ok: true; providerRef?: string } | { ok: false; reason: string };

export interface GiftCardProvider {
  captureValue(args: { conversionId: string }): Promise<CaptureValueResult>;
}

// Simple always-success mock
export class MockGiftCardProvider implements GiftCardProvider {
  async captureValue({ conversionId }: { conversionId: string }): Promise<CaptureValueResult> {
    return { ok: true, providerRef: `mock_gc_${conversionId}` };
  }
}

// Real-ish sandbox with delay + failure injection
export class SandboxGiftCardProvider implements GiftCardProvider {
  constructor(private ctx: SandboxContext) {}

  async captureValue({ conversionId }: { conversionId: string }): Promise<CaptureValueResult> {
    await this.ctx.delay();

    if (this.ctx.chance(this.ctx.cfg.failRateGiftCardCapture)) {
      return { ok: false, reason: "SANDBOX_GIFTCARD_CAPTURE_DECLINED" };
    }

    return { ok: true, providerRef: `sb_gc_${conversionId}_${this.ctx.idSuffix()}` };
  }
}
