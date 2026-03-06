// src/lib/wallet.ts
import type { LedgerEntryType, LedgerRefType, PrismaClient } from "@prisma/client";
import { newId } from "./ids.js";

export async function getOrCreateWallet(prisma: PrismaClient, userId: string) {
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.wallet.create({
    data: { id: newId(), userId, xrpDrops: 0n },
  });
}

/**
 * Idempotently create a ledger entry and update cached wallet balance in a transaction.
 * Uses @@unique([walletId, refType, refId, type]) to prevent duplicates.
 */
export async function applyLedgerEntry(args: { prisma: PrismaClient; walletId: string; type: LedgerEntryType; refType: LedgerRefType; refId: string; amountDrops: bigint }) {
  const { prisma, walletId, type, refType, refId, amountDrops } = args;

  return prisma.$transaction(async (tx) => {
    // Try create the entry; if it already exists, do nothing.
    try {
      await tx.ledgerEntry.create({
        data: {
          id: newId(),
          walletId,
          type,
          refType,
          refId,
          amountDrops,
        },
      });
    } catch (e: any) {
      // Prisma unique constraint violation → already applied
      if (e?.code === "P2002") {
        return { applied: false };
      }
      throw e;
    }

    // Update cached balance
    const delta = type === "CREDIT" ? amountDrops : -amountDrops;

    await tx.wallet.update({
      where: { id: walletId },
      data: { xrpDrops: { increment: delta } },
    });

    return { applied: true };
  });
}
