// src/providers/crypto/index.ts
import { prisma } from "../../db/prisma.js";
import type { SandboxContext } from "../../lib/sandbox.js";
import { dropsToXrpString, xrpToDrops } from "../../lib/xrp.js";

// backend/src/providers/crypto/index.ts (types)
export type BuyXrpResult =
  | { ok: true; xrpAmount?: string | number; providerRef?: string }
  | { ok: false; reason: string };

export type SellXrpResult = { ok: true; providerRef?: string } | { ok: false; reason: string };

export interface CryptoProvider {
  buyXrp(args: { conversionId: string }): Promise<BuyXrpResult>;
  sellXrp(args: { conversionId: string }): Promise<SellXrpResult>;
}

// Always-success mock
export class MockCryptoProvider implements CryptoProvider {
  async buyXrp({ conversionId }: { conversionId: string }): Promise<BuyXrpResult> {
    return { ok: true, providerRef: `mock_buy_${conversionId}` };
  }
  async sellXrp({ conversionId }: { conversionId: string }): Promise<SellXrpResult> {
    return { ok: true, providerRef: `mock_sell_${conversionId}` };
  }
}

// Real-ish sandbox with delay + failure + buy slippage
export class SandboxCryptoProvider implements CryptoProvider {
  constructor(private ctx: SandboxContext) {}

  async buyXrp({ conversionId }: { conversionId: string }): Promise<BuyXrpResult> {
    await this.ctx.delay();

    if (this.ctx.chance(this.ctx.cfg.failRateCryptoBuy)) {
      return { ok: false, reason: "SANDBOX_CRYPTO_BUY_FAILED" };
    }

    const conv = await prisma.conversion.findUnique({
      where: { id: conversionId },
      select: { xrpAmount: true },
    });

    if (!conv?.xrpAmount) {
      return { ok: false, reason: "SANDBOX_CRYPTO_BUY_MISSING_XRP_AMOUNT" };
    }

    // Apply slippage in drops (precise)
    const baseDrops = xrpToDrops(conv.xrpAmount);
    const bps = this.ctx.slippageBps(); // [-max..+max]
    const adjustedDrops = (baseDrops * BigInt(10_000 + bps)) / 10_000n;

    const xrpAmount = dropsToXrpString(adjustedDrops);

    return { ok: true, providerRef: `sb_buy_${conversionId}_${this.ctx.idSuffix()}`, xrpAmount };
  }

  async sellXrp({ conversionId }: { conversionId: string }): Promise<SellXrpResult> {
    await this.ctx.delay();

    if (this.ctx.chance(this.ctx.cfg.failRateCryptoSell)) {
      return { ok: false, reason: "SANDBOX_CRYPTO_SELL_FAILED" };
    }

    return { ok: true, providerRef: `sb_sell_${conversionId}_${this.ctx.idSuffix()}` };
  }
}
