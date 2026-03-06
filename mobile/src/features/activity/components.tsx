import { Pressable, Text, View } from "react-native";

import type { ActivityItem } from "@/src/lib/contracts";

import { getActivitySubtitle, getActivityTitle, getPrimaryAmount, getSecondaryAmount, prettifyStatus } from "./formatters";

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";

  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function getStatusTone(item: ActivityItem): "neutral" | "good" | "warn" | "bad" {
  if (item.failureReason || item.status === "FAILED") return "bad";

  if (item.requiresBank && !item.isTerminal) return "warn";

  if (item.isTerminal) return "good";

  return "neutral";
}

function StatusPill({ label, tone }: { label: string; tone: "neutral" | "good" | "warn" | "bad" }) {
  const text = tone === "good" ? "OK" : tone === "warn" ? "ATTN" : tone === "bad" ? "ERR" : "INFO";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <View
        style={{
          borderWidth: 1,
          borderColor: "#333",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 999,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "900" }}>{text}</Text>
      </View>

      <Text style={{ fontWeight: "800", flexShrink: 1 }}>{label}</Text>
    </View>
  );
}

export function ActivityCard({ item, onPress }: { item: ActivityItem; onPress: () => void }) {
  const statusLabel = item.displayStatus ?? prettifyStatus(item.status);

  const tone = getStatusTone(item);

  const primaryAmount = getPrimaryAmount(item);

  const secondaryAmount = getSecondaryAmount(item);

  const timestamp = item.updatedAt ?? item.createdAt;

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: "#333",
        borderRadius: 16,
        padding: 14,
      }}
    >
      <StatusPill label={statusLabel} tone={tone} />

      <Text style={{ marginTop: 10, fontSize: 16, fontWeight: "800" }}>{getActivityTitle(item)}</Text>

      <Text
        style={{
          marginTop: 6,
          opacity: 0.76,
          lineHeight: 20,
        }}
      >
        {getActivitySubtitle(item)}
      </Text>

      <View
        style={{
          marginTop: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          {primaryAmount ? <Text style={{ fontWeight: "900", fontSize: 16 }}>{primaryAmount}</Text> : null}

          {secondaryAmount ? <Text style={{ marginTop: 4, opacity: 0.72 }}>{secondaryAmount}</Text> : null}
        </View>

        <Text style={{ opacity: 0.58, fontSize: 12 }}>{formatDateTime(timestamp)}</Text>
      </View>
    </Pressable>
  );
}
