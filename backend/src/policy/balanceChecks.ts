// src/policy/balanceChecks.ts
export const BALANCE_CHECK_LIMITS = {
  // per-user velocity
  perUserPer10Min: 10,
  perUserPerDay: 50,

  // per-card velocity
  perCardPer10Min: 5,
  perCardPerDay: 20,
} as const;
