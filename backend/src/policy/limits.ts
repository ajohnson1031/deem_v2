// src/policy/limits.ts
export type LimitsPolicy = {
  currency: "USD";
  kycRequiredAboveCents: number;

  dailyMaxCents: number;
  weeklyMaxCents: number;

  perConversionMinCents: number;
  perConversionMaxCents: number;
};

export const LIMITS: LimitsPolicy = {
  currency: "USD",
  kycRequiredAboveCents: 5000, // $50

  dailyMaxCents: 25000, // $250/day
  weeklyMaxCents: 100000, // $1,000/week

  perConversionMinCents: 1000, // $10 min
  perConversionMaxCents: 25000, // $250 max
};

// Count these statuses toward usage so users can't spam pending conversions.
export const COUNTED_STATUSES = [
  "USER_CONFIRMED",
  "VALUE_CAPTURE_PENDING",
  "VALUE_CAPTURED",
  "XRP_PURCHASE_PENDING",
  "XRP_PURCHASED",
  "OFFRAMP_PENDING",
  "PAYOUT_PENDING",
  "COMPLETED",
] as const;
