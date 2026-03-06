import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, SafeAreaView, Text, View } from "react-native";

import { getActivity, getWalletBalance } from "@/src/api";
import { ActivityCard, formatXrp } from "@/src/features/activity";
import type { ActivityItem } from "@/src/lib/contracts";
import { useAuth } from "@/src/state/auth";

export default function HomeScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [balance, setBalance] = useState<any | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadHome = useCallback(async () => {
    if (!token) return;

    const [balanceRes, activityRes] = await Promise.all([getWalletBalance({ token }), getActivity({ token })]);

    setBalance(balanceRes.wallet ?? null);
    setActivity(activityRes.items ?? []);
    setLoadError(null);
  }, [token]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!token) return;

      setLoading(true);

      try {
        await loadHome();
      } catch (e: any) {
        if (!mounted) return;
        setBalance(null);
        setActivity([]);
        setLoadError(e?.message ?? "Unable to load account data.");
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
    } catch (e: any) {
      setLoadError(e?.message ?? "Unable to refresh.");
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

      {loadError ? (
        <View
          style={{
            marginTop: 16,
            borderWidth: 1,
            borderColor: "#333",
            borderRadius: 16,
            padding: 14,
          }}
        >
          <Text style={{ fontWeight: "800" }}>Unable to load some data</Text>
          <Text style={{ marginTop: 6, opacity: 0.75 }}>{loadError}</Text>
        </View>
      ) : null}

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
