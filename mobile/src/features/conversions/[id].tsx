import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

import { useConversionTimeline } from "@/src/hooks/useConversionTimeline";
import { useAuth } from "@/src/state/auth";

import { MostRecentUpdateCard, ProgressBar, StepRow, TimelineCard } from "@/src/features/conversions/components";
import { estimateRemainingMs, formatDurationMs, formatUsd, prettifyStatus } from "@/src/features/conversions/formatters";
import { buildProgressSteps } from "@/src/features/conversions/progress";

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

  const canViewReceipt = Boolean(conversion?.isTerminal) && !isFailed && Boolean(conversion?.id);

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

              {!!conversion?.displaySubtitle ? (
                <Text
                  style={{
                    marginTop: 6,
                    opacity: 0.78,
                    lineHeight: 20,
                  }}
                >
                  {conversion.displaySubtitle}
                </Text>
              ) : null}

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

              {!!conversion?.failureReason ? (
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
              ) : null}

              {!!error ? <Text style={{ marginTop: 12, opacity: 0.75 }}>{error}</Text> : null}

              {conversion?.requiresBank && !conversion?.isTerminal ? (
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
              ) : null}

              {canViewReceipt ? (
                <Pressable
                  onPress={() =>
                    router.replace({
                      pathname: "/(app)/receipt/[id]",
                      params: { id: conversion?.id ?? "" },
                    })
                  }
                  style={{
                    marginTop: 12,
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>View receipt</Text>
                </Pressable>
              ) : null}

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

        {!loading && conversion?.isTerminal && !isFailed ? (
          <Pressable
            onPress={() =>
              router.replace({
                pathname: "/(app)/receipt/[id]",
                params: { id: conversion?.id ?? "" },
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
            <Text style={{ fontWeight: "900" }}>Done</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
