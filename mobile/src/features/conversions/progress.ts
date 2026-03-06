import type { ConversionDto, ConversionTimelineItem } from "@/src/lib/contracts";

import { formatDateTime, formatUsd, prettifyStatus, shortProviderName } from "./formatters";

export type StepState = "done" | "current" | "pending";

export type ProgressStep = {
  key: string;
  title: string;
  subtitle: string;
  state: StepState;
};

export type EventCard = {
  title: string;
  subtitle: string;
  detail?: string | null;
  severity?: "neutral" | "good" | "warn" | "bad";
};

export function buildProgressSteps(conversion: ConversionDto | null | undefined, timeline: ConversionTimelineItem[]): ProgressStep[] {
  const status = conversion?.status ?? "";

  const hasEventType = (type: string) => timeline.some((event) => event?.type === type);

  const hasStatus = (target: string) => timeline.some((event) => event?.kind === "status" && event?.to === target);

  const hasReachedWaitingForBank = hasEventType("WAITING_FOR_BANK") || conversion?.requiresBank === true || status === "PAYOUT_PENDING";

  const hasBankAttached = hasEventType("BANK_ATTACHED") || !conversion?.requiresBank;

  const isTerminal = Boolean(conversion?.isTerminal);
  const failed = Boolean(conversion?.failureReason) || status === "FAILED";

  const quoteConfirmedDone = hasStatus("USER_CONFIRMED") || status !== "" || timeline.length > 0;

  const purchaseDone =
    hasStatus("XRP_PURCHASED") ||
    hasEventType("STEP_DONE_PURCHASE") ||
    hasEventType("STEP_DONE_XRP_PURCHASE") ||
    hasEventType("STEP_DONE_SWAP") ||
    ["XRP_PURCHASED", "PAYOUT_PENDING", "PAYOUT_SUBMITTED", "COMPLETED"].includes(status);

  const payoutSubmittedDone = hasStatus("PAYOUT_SUBMITTED") || hasEventType("STEP_DONE_PAYOUT") || ["PAYOUT_SUBMITTED", "COMPLETED"].includes(status);

  const completedDone = hasStatus("COMPLETED") || status === "COMPLETED";

  const steps: ProgressStep[] = [
    {
      key: "confirmed",
      title: "Conversion confirmed",
      subtitle: "Your quote was accepted and processing has started.",
      state: quoteConfirmedDone ? "done" : "pending",
    },
    {
      key: "purchase",
      title: "XRP purchase in progress",
      subtitle: purchaseDone ? "The asset purchase step has completed." : "We are pricing and executing the conversion.",
      state: purchaseDone ? "done" : quoteConfirmedDone ? "current" : "pending",
    },
    {
      key: "bank",
      title: "Bank required for payout",
      subtitle: hasBankAttached
        ? "A bank account is attached for cashout."
        : hasReachedWaitingForBank
          ? "We’re waiting for you to link a bank account."
          : "This step will be used only if payout needs a destination account.",
      state: hasBankAttached ? "done" : hasReachedWaitingForBank ? "current" : "pending",
    },
    {
      key: "payout",
      title: "Preparing payout",
      subtitle: payoutSubmittedDone
        ? "Your payout has been submitted."
        : hasBankAttached
          ? "We’re preparing the transfer to your linked bank."
          : "Payout starts after a bank account is attached.",
      state: payoutSubmittedDone ? "done" : hasBankAttached && !completedDone ? "current" : "pending",
    },
    {
      key: "complete",
      title: failed ? "Conversion failed" : "Conversion complete",
      subtitle: failed
        ? (conversion?.failureReason ?? "Something went wrong during processing.")
        : completedDone
          ? "Funds processing has finished."
          : "Finalizing the transaction.",
      state: completedDone || failed ? "done" : payoutSubmittedDone ? "current" : "pending",
    },
  ];

  if (isTerminal && failed) {
    return steps.map((step) => {
      if (step.key === "complete") {
        return {
          ...step,
          title: "Conversion failed",
          subtitle: conversion?.failureReason ?? "Something went wrong during processing.",
          state: "done" as StepState,
        };
      }
      return step;
    });
  }

  return steps;
}

export function eventToCard(e: ConversionTimelineItem): EventCard {
  const at = e?.at ? formatDateTime(e.at) : "";
  const kind = e?.kind ?? "misc";

  if (kind === "status") {
    const to = e?.to ? prettifyStatus(e.to) : "Updated";
    return {
      title: `Status updated: ${to}`,
      subtitle: "We moved to the next stage of processing.",
      detail: at,
      severity: "neutral",
    };
  }

  if (kind === "step") {
    const step = e?.step ? prettifyStatus(e.step) : "Step";
    return {
      title: `Step completed: ${step}`,
      subtitle: "This part of the pipeline finished successfully.",
      detail: at,
      severity: "good",
    };
  }

  if (kind === "action") {
    const title = e?.title || "Action required";
    const msg = e?.message || e?.reason || "We need a bank account linked before we can send your payout.";
    return {
      title,
      subtitle: msg,
      detail: at,
      severity: "warn",
    };
  }

  if (kind === "bank") {
    const label = e?.displayLabel || e?.bankLabel || (e?.masked ? `•••• ${e.masked}` : null);
    return {
      title: "Bank account linked",
      subtitle: label ? `Payout destination: ${label}` : "Your payout destination is now attached.",
      detail: at,
      severity: "good",
    };
  }

  if (kind === "provider") {
    const provider = shortProviderName(e?.provider);
    const op = e?.op ? prettifyStatus(String(e.op)) : "operation";
    const result = e?.result === "ok" || e?.result === "OK" ? "Succeeded" : e?.result ? String(e.result) : null;
    const reason = e?.reason ? String(e.reason) : null;

    return {
      title: `Provider check: ${op}`,
      subtitle: reason ? `${provider}: ${reason}` : result ? `${provider}: ${result}` : `${provider}: processing…`,
      detail: e?.providerRef ? `Ref: ${e.providerRef} • ${at}` : at,
      severity: reason ? "warn" : "neutral",
    };
  }

  if (kind === "ledger") {
    const action = e?.action ? prettifyStatus(String(e.action)) : "Ledger update";
    const amount = e?.amountCents != null ? formatUsd(Number(e.amountCents)) : null;
    return {
      title: `Ledger: ${action}`,
      subtitle: amount ? `Recorded: ${amount}` : "Funds movement was recorded internally.",
      detail: at,
      severity: "neutral",
    };
  }

  if (kind === "error") {
    const reason = e?.reason ? String(e.reason) : "Unknown error";
    return {
      title: "Conversion failed",
      subtitle: reason,
      detail: at,
      severity: "bad",
    };
  }

  if (kind === "job_error") {
    const err = e?.error ? String(e.error) : "Worker job error";
    return {
      title: "Processing error",
      subtitle: "We hit an internal error while processing. Retrying may occur automatically.",
      detail: `${err}\n\n${at}`,
      severity: "bad",
    };
  }

  const type = e?.type ? prettifyStatus(String(e.type)) : "Event";
  return {
    title: type,
    subtitle: "Processing update recorded.",
    detail: at,
    severity: "neutral",
  };
}
