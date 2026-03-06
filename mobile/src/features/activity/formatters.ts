import type { ActivityItem } from "@/src/lib/contracts";

export function formatUsd(cents?: number | null) {
  if (typeof cents !== "number") return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatXrp(xrp?: number | string | null) {
  if (xrp == null) return "—";

  const n = typeof xrp === "string" ? Number(xrp) : xrp;

  if (!Number.isFinite(n)) return String(xrp);

  return `${n.toFixed(2)} XRP`;
}

export function prettifyStatus(status?: string | null) {
  if (!status) return "Status";

  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getActivityTitle(item: ActivityItem) {
  if (item.title) return item.title;

  if (item.type === "conversion") return "Conversion";

  if (item.type === "payout") return "Payout";

  if (item.displayStatus) return item.displayStatus;

  return prettifyStatus(item.status) || "Activity";
}

export function getActivitySubtitle(item: ActivityItem) {
  if (item.subtitle) return item.subtitle;

  if (item.displaySubtitle) return item.displaySubtitle;

  if (item.failureReason) return item.failureReason;

  if (item.requiresBank && !item.isTerminal) {
    return "Link a bank to continue payout.";
  }

  if (typeof item.processingPercent === "number" && !item.isTerminal) {
    return `${Math.max(0, Math.min(100, Math.round(item.processingPercent)))}% complete`;
  }

  return "Processing update";
}

export function getPrimaryAmount(item: ActivityItem) {
  if (typeof item.netAmount?.cents === "number") {
    return formatUsd(item.netAmount.cents);
  }

  if (typeof item.sourceAmount?.cents === "number") {
    return formatUsd(item.sourceAmount.cents);
  }

  if (typeof item.amount?.cents === "number") {
    return formatUsd(item.amount.cents);
  }

  return null;
}

export function getSecondaryAmount(item: ActivityItem) {
  if (typeof item.xrpAmount === "number") {
    return formatXrp(item.xrpAmount);
  }

  return null;
}
