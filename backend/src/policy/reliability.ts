// src/policy/reliability.ts
export const RELIABILITY = {
  // How often watchdog runs
  watchdogEveryMinutes: 2,

  // Stuck thresholds by status (minutes since updatedAt)
  stuckMinutes: {
    USER_CONFIRMED: 5,
    VALUE_CAPTURE_PENDING: 5,
    XRP_PURCHASE_PENDING: 5,
    OFFRAMP_PENDING: 5,
    PAYOUT_PENDING: 10,
  } as const,

  // How many watchdog-triggered requeues before failing conversion
  maxWatchdogRequeues: 5,
} as const;

export const WATCHED_STATUSES = Object.keys(RELIABILITY.stuckMinutes) as Array<
  keyof typeof RELIABILITY.stuckMinutes
>;
