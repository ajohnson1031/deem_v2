import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, SafeAreaView, ScrollView, Text, View } from "react-native";

import { PrimaryButton, ScreenHeader, SectionCard } from "@/src/components/ui";
import { useConversionTimeline } from "@/src/hooks/useConversionTimeline";
import type { ConversionTimelineItem } from "@/src/lib/contracts";
import { formatDateTime, formatUsd, prettifyStatus } from "@/src/lib/format";
import { useAuth } from "@/src/state/auth";

function findBankLabelFromTimeline(timeline: ConversionTimelineItem[]) {
  const bankEvent = [...timeline].reverse().find((event) => event?.kind === "bank");

  if (!bankEvent) return null;
  if (bankEvent.displayLabel) return bankEvent.displayLabel;
  if (bankEvent.bankLabel) return bankEvent.bankLabel;
  if (bankEvent.masked) return `•••• ${bankEvent.masked}`;

  return "Linked bank account";
}

export default function ReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const conversionId = params.id ?? "";
  const { token } = useAuth();

  const { data, loading, error } = useConversionTimeline({
    token: token ?? "",
    conversionId,
    enabled: Boolean(token && conversionId),
    intervalMs: 1500,
  });

  const conversion = data?.conversion;
  const timeline = data?.timeline ?? [];
  const bankLabel = findBankLabelFromTimeline(timeline);

  const isSuccessfulTerminal =
    Boolean(conversion?.isTerminal) &&
    !conversion?.failureReason &&
    conversion?.status !== "FAILED";

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 28,
        }}
      >
        <ScreenHeader
          title="Receipt"
          subtitle={
            isSuccessfulTerminal
              ? "Your conversion has finished processing."
              : "Here is the latest available summary for this conversion."
          }
        />

        <SectionCard style={{ marginTop: 16 }}>
          {loading && !conversion ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <ActivityIndicator />
              <Text style={{ marginTop: 8, opacity: 0.75 }}>Loading receipt…</Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 20, fontWeight: "900" }}>
                {isSuccessfulTerminal ? "Conversion complete" : "Conversion summary"}
              </Text>

              <SectionCard style={{ marginTop: 16 }}>
                <Text style={{ fontWeight: "800" }}>Amounts</Text>

                <Text style={{ marginTop: 10, opacity: 0.85 }}>
                  Source: {formatUsd(conversion?.sourceAmount?.cents)}
                </Text>
                <Text style={{ marginTop: 6, opacity: 0.85 }}>
                  Fees: {formatUsd(conversion?.fees?.cents)}
                </Text>
                <Text style={{ marginTop: 6, opacity: 0.85 }}>
                  Net: {formatUsd(conversion?.netAmount?.cents)}
                </Text>
                <Text style={{ marginTop: 6, opacity: 0.85 }}>
                  XRP: {typeof conversion?.xrpAmount === "number" ? conversion.xrpAmount : "—"}
                </Text>
              </SectionCard>

              <SectionCard style={{ marginTop: 14 }}>
                <Text style={{ fontWeight: "800" }}>Details</Text>

                <Text style={{ marginTop: 10, opacity: 0.85 }}>
                  Conversion ID: {conversion?.id ?? "—"}
                </Text>
                <Text style={{ marginTop: 6, opacity: 0.85 }}>
                  Status: {prettifyStatus(conversion?.status)}
                </Text>
                <Text style={{ marginTop: 6, opacity: 0.85 }}>
                  Bank destination: {bankLabel ?? "Not attached"}
                </Text>
                <Text style={{ marginTop: 6, opacity: 0.85 }}>
                  Created: {formatDateTime(conversion?.createdAt)}
                </Text>
                <Text style={{ marginTop: 6, opacity: 0.85 }}>
                  Updated: {formatDateTime(conversion?.updatedAt)}
                </Text>
              </SectionCard>

              {!!conversion?.failureReason ? (
                <SectionCard style={{ marginTop: 14 }}>
                  <Text style={{ fontWeight: "800" }}>What happened</Text>
                  <Text style={{ marginTop: 8, opacity: 0.8 }}>{conversion.failureReason}</Text>
                </SectionCard>
              ) : null}

              {!!error ? <Text style={{ marginTop: 14, opacity: 0.75 }}>{error}</Text> : null}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <PrimaryButton
                  label="Home"
                  onPress={() => router.replace("/(app)")}
                  style={{ flex: 1 }}
                />

                <PrimaryButton
                  label="Back to status"
                  onPress={() =>
                    router.replace({
                      pathname: "/(app)/conversions/[id]",
                      params: { id: conversionId },
                    })
                  }
                  style={{ flex: 1 }}
                />
              </View>
            </>
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}
