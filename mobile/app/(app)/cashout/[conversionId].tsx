import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@/src/lib/api";
import { useAuth } from "@/src/state/auth";

type BankAccount = {
  id: string;
  displayLabel?: string;
  masked?: string;
};

type BankAccountsResponse = { accounts: BankAccount[] } | BankAccount[];

type PayoutResponse = {
  conversion: { id: string };
  ui: any;
  timeline: any[];
};

export default function CashoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ conversionId?: string }>();
  const conversionId = params.conversionId ?? "";
  const { token } = useAuth();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingPayout, setLoadingPayout] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) return;
      setLoadingAccounts(true);
      try {
        const res = await apiFetch<BankAccountsResponse>("/bank/accounts", {
          method: "GET",
          token,
        });

        const list = Array.isArray(res) ? res : (res as any).accounts;
        if (!cancelled) {
          setAccounts(list ?? []);
          setSelectedId((list?.[0]?.id as string) ?? null);
        }
      } catch (e: any) {
        Alert.alert("Failed to load banks", e?.message ?? "Unable to fetch bank accounts.");
      } finally {
        if (!cancelled) setLoadingAccounts(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const selected = useMemo(
    () => accounts.find((a) => a.id === selectedId) ?? null,
    [accounts, selectedId],
  );

  async function onCashout() {
    if (!token) return;
    if (!conversionId) {
      Alert.alert("Missing conversion", "No conversionId provided.");
      return;
    }
    if (!selectedId) {
      Alert.alert("Select a bank", "Choose a bank account to cash out to.");
      return;
    }

    setLoadingPayout(true);
    try {
      const res = await apiFetch<PayoutResponse>("/payouts", {
        method: "POST",
        token,
        body: { conversionId, bankAccountId: selectedId },
      });

      router.replace({ pathname: "/(app)/conversions/[id]", params: { id: res.conversion.id } });
    } catch (e: any) {
      Alert.alert("Cashout failed", e?.message ?? "Unable to initiate payout.");
    } finally {
      setLoadingPayout(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Cash out</Text>
      <Text style={{ marginTop: 6, opacity: 0.75 }}>
        Choose a linked bank account to receive the payout.
      </Text>

      <View
        style={{
          marginTop: 16,
          borderWidth: 1,
          borderColor: "#333",
          borderRadius: 16,
          padding: 14,
          flex: 1,
        }}
      >
        {loadingAccounts ? (
          <View style={{ paddingVertical: 10, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8, opacity: 0.7 }}>Loading bank accounts…</Text>
          </View>
        ) : accounts.length === 0 ? (
          <View style={{ paddingVertical: 10 }}>
            <Text style={{ fontWeight: "800" }}>No banks linked</Text>
            <Text style={{ marginTop: 6, opacity: 0.8 }}>Link a bank first.</Text>

            <Pressable
              onPress={() =>
                router.push({ pathname: "/(app)/bank/link", params: { conversionId } })
              }
              style={{
                marginTop: 12,
                backgroundColor: "#fff",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900" }}>Link a bank</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={{ fontWeight: "800", marginBottom: 10 }}>Linked banks</Text>

            <FlatList
              data={accounts}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              renderItem={({ item }) => {
                const selected = item.id === selectedId;
                return (
                  <Pressable
                    onPress={() => setSelectedId(item.id)}
                    style={{
                      borderWidth: 1,
                      borderColor: "#333",
                      borderRadius: 14,
                      padding: 12,
                      backgroundColor: selected ? "#fff" : "transparent",
                    }}
                  >
                    <Text style={{ fontWeight: "900" }}>{item.displayLabel ?? "Bank Account"}</Text>
                    <Text style={{ marginTop: 4, opacity: 0.75 }}>
                      {item.masked ? `•••• ${item.masked}` : ""}
                    </Text>
                  </Pressable>
                );
              }}
            />

            <View style={{ marginTop: 14 }}>
              <Text style={{ opacity: 0.75 }}>
                Sending to:{" "}
                <Text style={{ fontWeight: "900" }}>{selected?.displayLabel ?? "—"}</Text>
              </Text>

              <Pressable
                onPress={onCashout}
                disabled={loadingPayout}
                style={{
                  marginTop: 12,
                  backgroundColor: "#fff",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: loadingPayout ? 0.6 : 1,
                }}
              >
                {loadingPayout ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={{ fontWeight: "900" }}>Cash out</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>

      <Pressable
        onPress={() => router.back()}
        style={{ marginTop: 16, paddingVertical: 12, alignItems: "center" }}
      >
        <Text style={{ opacity: 0.7 }}>Back</Text>
      </Pressable>
    </SafeAreaView>
  );
}
