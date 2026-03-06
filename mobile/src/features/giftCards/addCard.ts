import type { GiftCardBalanceResponse } from "@/src/lib/contracts";

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeLast4(value: string) {
  return normalizeDigits(value).slice(0, 4);
}

export function toCentsMaybe(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  if (Number.isInteger(value) && value >= 50) {
    return value;
  }

  return Math.round(value * 100);
}

export function getBalanceCentsFromResponse(res: GiftCardBalanceResponse): number | null {
  const candidates = [
    res?.balance?.cents,
    res?.balanceCents,
    res?.giftCard?.balanceCents,
    res?.giftCard?.balanceUsd,
    res?.balanceUsd,
  ];

  for (const candidate of candidates) {
    const cents = toCentsMaybe(candidate);
    if (typeof cents === "number" && Number.isFinite(cents)) {
      return cents;
    }
  }

  return null;
}
