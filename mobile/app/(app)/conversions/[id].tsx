import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, FlatList, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

import { useConversionTimeline } from "@/src/hooks/useConversionTimeline";
import { useAuth } from "@/src/state/auth";

type StepState = "done" | "current" | "pending";

type ProgressStep = {
  key: string;
  title: string;
  subtitle: string;
  state: StepState;
};

type EventCard = {
  title: string;
  subtitle: string;
  detail?: string | null;
  severity?: "neutral" | "good" | "warn" | "bad";
};

function formatUsd(cents?: number | null) {
  if (typeof cents !== "number") return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function prettifyStatus(status?: string | null) {
  if (!status) return "Unknown";
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shortProviderName(provider?: string | null) {
  if (!provider) return "provider";
  const p = provider.toLowerCase();
  if (p.includes("mock")) return "provider";
  if (p.includes("sandbox")) return "provider";
  return provider;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function safeJson(v: any) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function formatDurationMs(ms: number | null) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "Calculating…";

  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  if (mins <= 0) return `~${secs}s remaining`;
  if (mins < 60) return `~${mins}m ${secs}s remaining`;

  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `~${hours}h ${remMins}m remaining`;
}

function estimateRemainingMs(percent?: number | null, createdAt?: string | null, isTerminal?: boolean) {
  if (isTerminal) return 0;
  if (typeof percent !== "number") return null;
  if (percent <= 0 || percent >= 100) return null;
  if (!createdAt) return null;

  const startedAt = new Date(createdAt).getTime();
  if (!Number.isFinite(startedAt)) return null;

  const elapsed = Date.now() - startedAt;
  if (elapsed <= 0) return null;

  const rate = percent / elapsed; // percent per ms
  if (rate <= 0) return null;

  const remainingPercent = 100 - percent;
  return remainingPercent / rate;
}

function buildProgressSteps(conversion: any, timeline: any[]): ProgressStep[] {
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
          state: "done",
        };
      }
      return step;
    });
  }

  return steps;
}

function eventToCard(e: any): EventCard {
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

function SeverityPill({ severity }: { severity?: EventCard["severity"] }) {
  const label = severity === "good" ? "OK" : severity === "warn" ? "ATTN" : severity === "bad" ? "ERR" : "INFO";

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#333",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        marginLeft: 10,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}

function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.35,
            duration: 700,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 700,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.35,
            duration: 700,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.9,
            duration: 700,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity, scale]);

  return (
    <Animated.View
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        backgroundColor: "#fff",
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function StepRow({ step }: { step: ProgressStep }) {
  const isDone = step.state === "done";
  const isCurrent = step.state === "current";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 14,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1,
          borderColor: "#333",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
          backgroundColor: isDone ? "#fff" : "transparent",
        }}
      >
        {isDone ? <Text style={{ fontSize: 12, fontWeight: "800" }}>✓</Text> : isCurrent ? <PulseDot /> : null}
      </View>

      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text
          style={{
            fontWeight: "800",
            opacity: step.state === "pending" ? 0.7 : 1,
          }}
        >
          {step.title}
        </Text>
        <Text
          style={{
            marginTop: 4,
            opacity: 0.72,
            lineHeight: 20,
          }}
        >
          {step.subtitle}
        </Text>
      </View>
    </View>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <View style={{ marginTop: 12 }}>
      <View
        style={{
          height: 10,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "#333",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${safe}%`,
            height: "100%",
            backgroundColor: "#fff",
          }}
        />
      </View>
      <Text style={{ marginTop: 8, opacity: 0.75 }}>{safe}% complete</Text>
    </View>
  );
}

function TimelineCard({ event }: { event: any }) {
  const [showDetails, setShowDetails] = useState(false);
  const card = eventToCard(event);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#333",
        borderRadius: 14,
        padding: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontWeight: "900", flex: 1 }}>{card.title}</Text>
        <SeverityPill severity={card.severity} />
      </View>

      <Text style={{ marginTop: 6, opacity: 0.78, lineHeight: 20 }}>{card.subtitle}</Text>

      <View style={{ marginTop: 10 }}>
        <Pressable onPress={() => setShowDetails((v) => !v)} style={{ alignSelf: "flex-start" }}>
          <Text style={{ opacity: 0.7, fontWeight: "700" }}>{showDetails ? "Hide details" : "Show details"}</Text>
        </Pressable>

        {showDetails && (
          <View
            style={{
              marginTop: 10,
              borderTopWidth: 1,
              borderTopColor: "#333",
              paddingTop: 10,
            }}
          >
            {card.detail ? <Text style={{ opacity: 0.75, marginBottom: 10 }}>{card.detail}</Text> : null}
            <Text style={{ fontSize: 12, opacity: 0.7 }}>Raw event</Text>
            <Text style={{ marginTop: 6, opacity: 0.85 }}>{safeJson(event)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function MostRecentUpdateCard({ event }: { event: any }) {
  const card = eventToCard(event);

  return (
    <View
      style={{
        marginTop: 16,
        borderWidth: 1,
        borderColor: "#333",
        borderRadius: 18,
        padding: 16,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: "800" }}>Most recent update</Text>

      <View style={{ marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontWeight: "900", flex: 1 }}>{card.title}</Text>
          <SeverityPill severity={card.severity} />
        </View>

        <Text style={{ marginTop: 6, opacity: 0.78, lineHeight: 20 }}>{card.subtitle}</Text>

        <Text style={{ marginTop: 10, opacity: 0.62, fontSize: 12 }}>{formatDateTime(event?.at)}</Text>
      </View>
    </View>
  );
}

export default function ConversionStatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const conversionId = params.id ?? "";
  const { token } = useAuth();

  const { data, loading, error, refresh } = useConversionTimeline({
    token: token ?? "",
    conversionId,
    enabled: Boolean(token && conversionId),
    intervalMs: 1500,
  });

  const conversion = data?.conversion;
  const timeline = data?.timeline ?? [];

  const steps = useMemo(() => buildProgressSteps(conversion, timeline), [conversion, timeline]);

  const percent = typeof conversion?.processingPercent === "number" ? conversion.processingPercent : 0;

  const isFailed = Boolean(conversion?.failureReason) || conversion?.status === "FAILED";

  const mostRecentEvent = useMemo(() => {
    if (!timeline.length) return null;
    return timeline[timeline.length - 1];
  }, [timeline]);

  const remainingMs = useMemo(
    () => estimateRemainingMs(conversion?.processingPercent, conversion?.createdAt, conversion?.isTerminal),
    [conversion?.processingPercent, conversion?.createdAt, conversion?.isTerminal],
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 28,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Conversion</Text>

        <View
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: "#333",
            borderRadius: 18,
            padding: 16,
          }}
        >
          {loading && !conversion ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <ActivityIndicator />
              <Text style={{ marginTop: 8, opacity: 0.75 }}>Loading conversion status…</Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 20, fontWeight: "800" }}>{conversion?.displayStatus ?? "Processing"}</Text>

              {!!conversion?.displaySubtitle && (
                <Text
                  style={{
                    marginTop: 6,
                    opacity: 0.78,
                    lineHeight: 20,
                  }}
                >
                  {conversion.displaySubtitle}
                </Text>
              )}

              <ProgressBar percent={percent} />

              <View
                style={{
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: "#333",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <Text style={{ fontWeight: "800" }}>Estimated time</Text>
                <Text style={{ marginTop: 6, opacity: 0.78 }}>
                  {conversion?.isTerminal ? "Complete" : conversion?.requiresBank ? "Waiting on bank link" : formatDurationMs(remainingMs)}
                </Text>
                <Text style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>This is a simple estimate based on elapsed time and current progress.</Text>
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={{ opacity: 0.82 }}>Source: {formatUsd(conversion?.sourceAmount?.cents)}</Text>
                <Text style={{ opacity: 0.82, marginTop: 4 }}>Fees: {formatUsd(conversion?.fees?.cents)}</Text>
                <Text style={{ opacity: 0.82, marginTop: 4 }}>Net: {formatUsd(conversion?.netAmount?.cents)}</Text>
                <Text style={{ opacity: 0.82, marginTop: 4 }}>XRP: {typeof conversion?.xrpAmount === "number" ? conversion.xrpAmount : "—"}</Text>
                <Text style={{ opacity: 0.62, marginTop: 8, fontSize: 12 }}>Internal status: {prettifyStatus(conversion?.status)}</Text>
              </View>

              {!!conversion?.failureReason && (
                <View
                  style={{
                    marginTop: 14,
                    borderWidth: 1,
                    borderColor: "#333",
                    borderRadius: 14,
                    padding: 12,
                  }}
                >
                  <Text style={{ fontWeight: "800" }}>What happened</Text>
                  <Text style={{ marginTop: 6, opacity: 0.8 }}>{conversion.failureReason}</Text>
                </View>
              )}

              {!!error && <Text style={{ marginTop: 12, opacity: 0.75 }}>{error}</Text>}

              {conversion?.requiresBank && !conversion?.isTerminal && (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/bank/link",
                      params: { conversionId },
                    })
                  }
                  style={{
                    marginTop: 16,
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>Link bank to continue</Text>
                </Pressable>
              )}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Pressable
                  onPress={refresh}
                  style={{
                    flex: 1,
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "800" }}>Refresh</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.replace("/(app)")}
                  style={{
                    flex: 1,
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "800" }}>Home</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {mostRecentEvent ? <MostRecentUpdateCard event={mostRecentEvent} /> : null}

        <View
          style={{
            marginTop: 16,
            borderWidth: 1,
            borderColor: "#333",
            borderRadius: 18,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "800" }}>Processing steps</Text>
          <Text
            style={{
              marginTop: 6,
              opacity: 0.72,
              lineHeight: 20,
            }}
          >
            These update automatically as your conversion moves through each stage.
          </Text>

          <View style={{ marginTop: 14 }}>
            {steps.map((step) => (
              <StepRow key={step.key} step={step} />
            ))}
          </View>
        </View>

        <View
          style={{
            marginTop: 16,
            borderWidth: 1,
            borderColor: "#333",
            borderRadius: 18,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "800" }}>Updates</Text>
          <Text
            style={{
              marginTop: 6,
              opacity: 0.72,
              lineHeight: 20,
            }}
          >
            Clear, user-friendly updates with raw details available when needed.
          </Text>

          <FlatList
            scrollEnabled={false}
            style={{ marginTop: 14 }}
            data={[...timeline].reverse()}
            keyExtractor={(item, index) => `${item.id ?? item.at}-${index}`}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => <TimelineCard event={item} />}
            ListEmptyComponent={
              <View style={{ paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ opacity: 0.7 }}>No updates yet.</Text>
              </View>
            }
          />
        </View>

        {!loading && conversion?.isTerminal && !isFailed && (
          <Pressable
            onPress={() => router.replace("/(app)")}
            style={{
              marginTop: 16,
              backgroundColor: "#fff",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "900" }}>Done</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
