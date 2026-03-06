import type { ActivityItem } from "@/src/lib/contracts";
import { formatUsd, formatXrp, prettifyStatus } from "@/src/lib/format";

export { formatUsd, formatXrp, prettifyStatus };

export function getActivityTitle(item: ActivityItem) {
  if (item.title) return item.title;
  if (item.type === "conversion") return "Conversion";
  if (item.type === "payout") return "Payout";
  if (item.displayStatus) return item.displayStatus;

  return prettifyStatus(item.status, "Activity");
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
