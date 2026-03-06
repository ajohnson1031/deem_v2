// src/lib/displayStatus.ts
export type DisplayStatus = {
  displayStatus: string;
  displaySubtitle: string;
  processingPercent: number; // 0..100
  requiresBank: boolean;
  isTerminal: boolean;
};

export function getDisplayStatus(args: { status: string; hasBank: boolean; failureReason?: string | null }): DisplayStatus {
  const { status, hasBank, failureReason } = args;

  const terminal = (s: string) => ["COMPLETED", "FAILED", "CANCELED"].includes(s);

  switch (status) {
    case "CREATED":
      return { displayStatus: "Created", displaySubtitle: "Starting up…", processingPercent: 5, requiresBank: false, isTerminal: false };

    case "BALANCE_VERIFIED":
      return { displayStatus: "Verified", displaySubtitle: "Balance verified", processingPercent: 10, requiresBank: false, isTerminal: false };

    case "QUOTED":
      return { displayStatus: "Quoted", displaySubtitle: "Reviewing quote", processingPercent: 15, requiresBank: false, isTerminal: false };

    case "USER_CONFIRMED":
      return { displayStatus: "Processing", displaySubtitle: "Queued for processing", processingPercent: 20, requiresBank: false, isTerminal: false };

    case "VALUE_CAPTURE_PENDING":
      return { displayStatus: "Processing", displaySubtitle: "Capturing value", processingPercent: 30, requiresBank: false, isTerminal: false };

    case "VALUE_CAPTURED":
      return { displayStatus: "Processing", displaySubtitle: "Value captured", processingPercent: 45, requiresBank: false, isTerminal: false };

    case "XRP_PURCHASE_PENDING":
      return { displayStatus: "Processing", displaySubtitle: "Buying XRP", processingPercent: 55, requiresBank: false, isTerminal: false };

    case "XRP_PURCHASED":
      return { displayStatus: "Processing", displaySubtitle: "XRP purchased", processingPercent: 65, requiresBank: false, isTerminal: false };

    case "OFFRAMP_PENDING":
      return { displayStatus: "Processing", displaySubtitle: "Preparing cashout", processingPercent: 75, requiresBank: false, isTerminal: false };

    case "PAYOUT_PENDING":
      if (!hasBank) {
        return { displayStatus: "Action needed", displaySubtitle: "Link a bank to cash out", processingPercent: 85, requiresBank: true, isTerminal: false };
      }
      return { displayStatus: "Processing", displaySubtitle: "Sending payout", processingPercent: 90, requiresBank: false, isTerminal: false };

    case "COMPLETED":
      return { displayStatus: "Completed", displaySubtitle: "Cashout complete", processingPercent: 100, requiresBank: false, isTerminal: true };

    case "CANCELED":
      return { displayStatus: "Canceled", displaySubtitle: "Conversion canceled", processingPercent: 100, requiresBank: false, isTerminal: true };

    case "FAILED":
      return {
        displayStatus: "Failed",
        displaySubtitle: failureReason ? `Failed: ${failureReason}` : "Something went wrong",
        processingPercent: 100,
        requiresBank: false,
        isTerminal: true,
      };

    default:
      return { displayStatus: "Processing", displaySubtitle: "In progress", processingPercent: terminal(status) ? 100 : 50, requiresBank: false, isTerminal: terminal(status) };
  }
}
