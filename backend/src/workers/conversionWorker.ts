// src/workers/conversionWorker.ts
import type { ConnectionOptions } from "bullmq";
import { Job, Worker } from "bullmq";
import "../bootstrap/env.ts";

import { prisma } from "../db/prisma.js";
import { newId } from "../lib/ids.js";
import { getBullMqConnection } from "../queues/connection.js";

import { applyLedgerEntry, getOrCreateWallet } from "../lib/wallet.js";
import { xrpToDrops } from "../lib/xrp.js";

import type { ProviderRegistry } from "../providers/registry.js";

type ConversionJobData = { conversionId: string };

async function addEvent(conversionId: string, type: string, payload: any) {
  await prisma.conversionEvent.create({
    data: { id: newId(), conversionId, type, payload },
  });
}

async function hasEvent(conversionId: string, type: string) {
  const found = await prisma.conversionEvent.findFirst({
    where: { conversionId, type },
    select: { id: true },
  });
  return Boolean(found);
}

async function markStepDone(conversionId: string, step: string, payload: any = {}) {
  const type = `STEP_DONE_${step}`;
  if (await hasEvent(conversionId, type)) return;
  await addEvent(conversionId, type, payload);
}

async function transition(conversionId: string, to: string) {
  await prisma.conversion.update({ where: { id: conversionId }, data: { status: to as any } });
  await addEvent(conversionId, "STATUS_CHANGED", { to });
}

async function fail(conversionId: string, reason: string) {
  await prisma.conversion.update({
    where: { id: conversionId },
    data: { status: "FAILED", failureReason: reason },
  });
  await addEvent(conversionId, "FAILED", { reason });
}

function createProcessor(providers: ProviderRegistry) {
  return async function processConversion(conversionId: string) {
    const c = await prisma.conversion.findUnique({
      where: { id: conversionId },
      select: {
        id: true,
        userId: true,
        status: true,
        bankAccountId: true,
        xrpAmount: true,
      },
    });

    if (!c) return;
    if (["COMPLETED", "FAILED", "CANCELED"].includes(c.status)) return;

    // KYC gating
    if (!(await hasEvent(conversionId, "STEP_DONE_KYC"))) {
      const kyc = await providers.kyc.ensureVerified({ userId: c.userId });
      if (!kyc.ok) return fail(conversionId, `KYC_${kyc.reason}`);
      await markStepDone(conversionId, "KYC");
    }

    switch (c.status) {
      case "USER_CONFIRMED": {
        await transition(conversionId, "VALUE_CAPTURE_PENDING");
        return processConversion(conversionId);
      }

      case "VALUE_CAPTURE_PENDING": {
        if (!(await hasEvent(conversionId, "STEP_DONE_VALUE_CAPTURE"))) {
          const res = await providers.giftCard.captureValue({ conversionId });

          await addEvent(conversionId, "PROVIDER_CALL", {
            provider: "giftcard",
            op: "capture_value",
            result: res.ok ? "ok" : "fail",
            providerRef: res.ok ? res.providerRef : undefined,
            reason: !res.ok ? res.reason : undefined,
          });

          if (!res.ok) return fail(conversionId, "VALUE_CAPTURE_FAILED");
          await markStepDone(conversionId, "VALUE_CAPTURE", { providerRef: res.providerRef });
        }

        await transition(conversionId, "VALUE_CAPTURED");
        return processConversion(conversionId);
      }

      case "VALUE_CAPTURED": {
        await transition(conversionId, "XRP_PURCHASE_PENDING");
        return processConversion(conversionId);
      }

      case "XRP_PURCHASE_PENDING": {
        if (!(await hasEvent(conversionId, "STEP_DONE_XRP_BUY"))) {
          const res = await providers.crypto.buyXrp({ conversionId });

          await addEvent(conversionId, "PROVIDER_CALL", {
            provider: "crypto",
            op: "buy_xrp",
            result: res.ok ? "ok" : "fail",
            providerRef: res.ok ? res.providerRef : undefined,
            reason: !res.ok ? res.reason : undefined,
          });

          if (!res.ok) return fail(conversionId, "XRP_PURCHASE_FAILED");

          // exactOptionalPropertyTypes-safe update
          const data: any = {};
          if (res.xrpAmount != null) data.xrpAmount = res.xrpAmount;
          if (Object.keys(data).length)
            await prisma.conversion.update({ where: { id: conversionId }, data });

          // Ledger credit (custodial)
          const wallet = await getOrCreateWallet(prisma, c.userId);
          const xrpAmountForLedger = (res as any).xrpAmount ?? c.xrpAmount;
          if (xrpAmountForLedger != null) {
            const drops = xrpToDrops(xrpAmountForLedger);
            await applyLedgerEntry({
              prisma,
              walletId: wallet.id,
              type: "CREDIT",
              refType: "CONVERSION",
              refId: conversionId,
              amountDrops: drops,
            });
            await addEvent(conversionId, "LEDGER", { op: "CREDIT", drops: drops.toString() });
          }

          await markStepDone(conversionId, "XRP_BUY", { providerRef: res.providerRef });
        }

        await transition(conversionId, "XRP_PURCHASED");
        return processConversion(conversionId);
      }

      case "XRP_PURCHASED": {
        await transition(conversionId, "OFFRAMP_PENDING");
        return processConversion(conversionId);
      }

      case "OFFRAMP_PENDING": {
        if (!(await hasEvent(conversionId, "STEP_DONE_XRP_SELL"))) {
          const res = await providers.crypto.sellXrp({ conversionId });

          await addEvent(conversionId, "PROVIDER_CALL", {
            provider: "crypto",
            op: "sell_xrp",
            result: res.ok ? "ok" : "fail",
            providerRef: res.ok ? res.providerRef : undefined,
            reason: !res.ok ? res.reason : undefined,
          });

          if (!res.ok) return fail(conversionId, "OFFRAMP_FAILED");

          // Ledger debit
          const wallet = await getOrCreateWallet(prisma, c.userId);
          if (c.xrpAmount != null) {
            const drops = xrpToDrops(c.xrpAmount);
            await applyLedgerEntry({
              prisma,
              walletId: wallet.id,
              type: "DEBIT",
              refType: "CONVERSION",
              refId: conversionId,
              amountDrops: drops,
            });
            await addEvent(conversionId, "LEDGER", { op: "DEBIT", drops: drops.toString() });
          }

          await markStepDone(conversionId, "XRP_SELL", { providerRef: res.providerRef });
        }

        await transition(conversionId, "PAYOUT_PENDING");
        return processConversion(conversionId);
      }

      case "PAYOUT_PENDING": {
        // Pause until bank account attached
        if (!c.bankAccountId) {
          if (!(await hasEvent(conversionId, "WAITING_FOR_BANK"))) {
            await addEvent(conversionId, "WAITING_FOR_BANK", {
              msg: "Attach a bank account to cash out.",
            });
          }
          return;
        }

        if (!(await hasEvent(conversionId, "STEP_DONE_PAYOUT"))) {
          const res = await providers.payout.payoutAch({ conversionId });

          await addEvent(conversionId, "PROVIDER_CALL", {
            provider: "payout",
            op: "ach_payout",
            result: res.ok ? "ok" : "fail",
            providerRef: res.ok ? res.providerRef : undefined,
            reason: !res.ok ? res.reason : undefined,
          });

          if (!res.ok) return fail(conversionId, "PAYOUT_FAILED");

          await markStepDone(conversionId, "PAYOUT", { providerRef: res.providerRef });
        }

        await transition(conversionId, "COMPLETED");
        return;
      }

      default: {
        await addEvent(conversionId, "WARN", { msg: "Unhandled status", status: c.status });
        return;
      }
    }
  };
}

export function startConversionWorker(
  providers: ProviderRegistry,
  connection: ConnectionOptions = getBullMqConnection(),
) {
  const processConversion = createProcessor(providers);

  const worker = new Worker<ConversionJobData>(
    "conversion",
    async (job: Job<ConversionJobData>) => {
      await processConversion(job.data.conversionId);
    },
    { connection, concurrency: 5 },
  );

  worker.on("failed", async (job, err) => {
    if (!job) return;
    await addEvent(job.data.conversionId, "JOB_FAILED", { error: err.message });
  });

  worker.on("completed", async (job) => {
    if (!job) return;
    await addEvent(job.data.conversionId, "JOB_COMPLETED", { jobId: job.id });
  });

  return worker;
}
