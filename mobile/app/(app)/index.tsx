import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, SafeAreaView, Text, View } from "react-native";

import { apiFetch } from "@/src/lib/api";
import { useAuth } from "@/src/state/auth";

type BalanceResponse = {
  wallet?: {
    id: string;
    xrpDrops?: number;
    xrp?: number | string;
  };
};

type ActivityItem = {
  id?: string;
  conversionId?: string;
  type?: string;
  status?: string;
  displayStatus?: string;
  displaySubtitle?: string;
  processingPercent?: number | null;
  requiresBank?: boolean;
  isTerminal?: boolean;
  failureReason?: string | null;

  createdAt?: string;
  updatedAt?: string;

  sourceAmount?: { cents?: number; currency?: string };
  netAmount?: { cents?: number; currency?: string };
  fees?: { cents?: number; currency?: string };

  amount?: { cents?: number; currency?: string };
  xrpAmount?: number | null;

  title?: string;
  subtitle?: string;
};

type ActivityResponse = {
  items?: ActivityItem[];
  nextCursor?: string | null;
};

function formatUsd(cents?: number | null) {
  if (typeof cents !== "number") return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatXrp(xrp?: number | string | null) {
  if (xrp == null) return "—";
  const n = typeof xrp === "string" ? Number(xrp) : xrp;
  if (!Number.isFinite(n)) return String(xrp);
  return `${n.toFixed(2)} XRP`;
}

function prettifyStatus(status?: string | null) {
  if (!status) return "Status";
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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

      <Text style={{ fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

function getActivityTitle(item: ActivityItem) {
  if (item.title) return item.title;
  if (item.displayStatus) return item.displayStatus;
  if (item.type === "conversion") return "Conversion";
  if (item.type === "payout") return "Payout";
  return prettifyStatus(item.status) || "Activity";
}

function getActivitySubtitle(item: ActivityItem) {
  if (item.subtitle) return item.subtitle;
  if (item.displaySubtitle) return item.displaySubtitle;
  if (item.failureReason) return item.failureReason;
  if (item.requiresBank && !item.isTerminal) return "Link a bank to continue payout.";
  if (typeof item.processingPercent === "number" && !item.isTerminal) {
    return `${Math.max(0, Math.min(100, Math.round(item.processingPercent)))}% complete`;
  }
  return "Processing update";
}

function getPrimaryAmount(item: ActivityItem) {
  if (typeof item.netAmount?.cents === "number") return formatUsd(item.netAmount.cents);
  if (typeof item.sourceAmount?.cents === "number") return formatUsd(item.sourceAmount.cents);
  if (typeof item.amount?.cents === "number") return formatUsd(item.amount.cents);
  return null;
}

function getSecondaryAmount(item: ActivityItem) {
  if (typeof item.xrpAmount === "number") return formatXrp(item.xrpAmount);
  return null;
}

function ActivityCard({ item, onPress }: { item: ActivityItem; onPress: () => void }) {
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
        <View>
          {primaryAmount ? <Text style={{ fontWeight: "900", fontSize: 16 }}>{primaryAmount}</Text> : null}

          {secondaryAmount ? <Text style={{ marginTop: 4, opacity: 0.72 }}>{secondaryAmount}</Text> : null}
        </View>

        <Text style={{ opacity: 0.58, fontSize: 12, marginLeft: 12 }}>{formatDateTime(timestamp)}</Text>
      </View>

      {item.requiresBank && !item.isTerminal ? (
        <View
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: "#333",
            borderRadius: 12,
            padding: 10,
          }}
        >
          <Text style={{ fontWeight: "800" }}>Action needed</Text>
          <Text style={{ marginTop: 4, opacity: 0.75 }}>Link a bank account to continue this cashout.</Text>
        </View>
      ) : null}

      <Text style={{ marginTop: 12, opacity: 0.68, fontWeight: "700" }}>View details</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [balance, setBalance] = useState<BalanceResponse["wallet"] | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHome = useCallback(async () => {
    if (!token) return;

    const [balanceRes, activityRes] = await Promise.all([
      apiFetch<BalanceResponse>("/balance", { method: "GET", token }),
      apiFetch<ActivityResponse>("/activity", { method: "GET", token }),
    ]);

    setBalance(balanceRes.wallet ?? null);
    setActivity(activityRes.items ?? []);
  }, [token]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!token) return;
      setLoading(true);
      try {
        await loadHome();
      } catch {
        if (mounted) {
          setBalance(null);
          setActivity([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [loadHome, token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadHome();
    } finally {
      setRefreshing(false);
    }
  }, [loadHome]);

  const walletXrp = useMemo(() => formatXrp(balance?.xrp ?? null), [balance?.xrp]);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>Deem</Text>
      <Text style={{ marginTop: 6, opacity: 0.75 }}>Convert gift card balances into XRP and cash out.</Text>

      <View
        style={{
          marginTop: 16,
          borderWidth: 1,
          borderColor: "#333",
          borderRadius: 18,
          padding: 16,
        }}
      >
        <Text style={{ fontWeight: "800", fontSize: 16 }}>Wallet balance</Text>

        {loading ? (
          <View style={{ marginTop: 10, alignItems: "flex-start" }}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <Text style={{ marginTop: 10, fontSize: 28, fontWeight: "900" }}>{walletXrp}</Text>

            {typeof balance?.xrpDrops === "number" ? <Text style={{ marginTop: 6, opacity: 0.68 }}>{balance.xrpDrops.toLocaleString()} drops</Text> : null}
          </>
        )}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <Pressable
            onPress={() => router.push("/(app)/add-card")}
            style={{
              flex: 1,
              backgroundColor: "#fff",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "900" }}>Add Card</Text>
          </Pressable>

          <Pressable
            onPress={onRefresh}
            style={{
              flex: 1,
              backgroundColor: "#fff",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "900" }}>Refresh</Text>
          </Pressable>
        </View>
      </View>

      <View
        style={{
          marginTop: 16,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "900" }}>Recent activity</Text>
        <Text style={{ opacity: 0.65 }}>{activity.length}</Text>
      </View>

      {loading ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator />
          <Text style={{ marginTop: 10, opacity: 0.72 }}>Loading activity…</Text>
        </View>
      ) : (
        <FlatList
          data={activity}
          keyExtractor={(item, index) => String(item.conversionId ?? item.id ?? `${item.status ?? "activity"}-${index}`)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const targetId = item.conversionId ?? item.id;

            return (
              <ActivityCard
                item={item}
                onPress={() => {
                  if (targetId) {
                    router.push({
                      pathname: "/(app)/conversions/[id]",
                      params: { id: String(targetId) },
                    });
                    return;
                  }

                  onRefresh();
                }}
              />
            );
          }}
          ListEmptyComponent={
            <View
              style={{
                marginTop: 20,
                borderWidth: 1,
                borderColor: "#333",
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "800" }}>No activity yet</Text>
              <Text
                style={{
                  marginTop: 6,
                  opacity: 0.72,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Add a gift card to start your first conversion.
              </Text>

              <Pressable
                onPress={() => router.push("/(app)/add-card")}
                style={{
                  marginTop: 14,
                  backgroundColor: "#fff",
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 18,
                }}
              >
                <Text style={{ fontWeight: "900" }}>Add Card</Text>
              </Pressable>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}
