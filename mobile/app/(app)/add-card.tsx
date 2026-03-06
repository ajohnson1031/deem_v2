import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { apiFetch, GiftCardBalanceResponse, GiftCardCreateResponse } from "../../src/lib/api";
import { useAuth } from "../../src/state/auth";

export default function AddCardScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [type, setType] = useState<"OPEN_LOOP" | "STORE">("OPEN_LOOP");
  const [brand, setBrand] = useState("Visa");
  const [last4, setLast4] = useState("1234");
  const [loading, setLoading] = useState(false);

  const [createdId, setCreatedId] = useState<string | null>(null);
  const [balanceCents, setBalanceCents] = useState<number | null>(null);

  const onCreateAndCheck = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setCreatedId(null);
      setBalanceCents(null);

      const created = await apiFetch<GiftCardCreateResponse>("/gift-cards", {
        method: "POST",
        token,
        body: { type, brand, last4 },
      });

      const gcId = created.giftCard.id;
      setCreatedId(gcId);

      const bal = await apiFetch<GiftCardBalanceResponse>(`/gift-cards/${gcId}/balance`, {
        method: "POST",
        token,
        body: {},
      });

      setBalanceCents(bal.balanceUsd);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Add Card</Text>

      <Text style={{ opacity: 0.7 }}>Type (manual toggle): {type} </Text>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Button title="Open-loop" onPress={() => setType("OPEN_LOOP")} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Store" onPress={() => setType("STORE")} />
        </View>
      </View>

      <TextInput value={brand} onChangeText={setBrand} placeholder="Brand (e.g. Visa)" style={{ borderWidth: 1, borderColor: "#333", padding: 12, borderRadius: 10 }} />
      <TextInput
        value={last4}
        onChangeText={setLast4}
        placeholder="Last 4"
        maxLength={4}
        keyboardType="number-pad"
        style={{ borderWidth: 1, borderColor: "#333", padding: 12, borderRadius: 10 }}
      />

      <Button title={loading ? "Working..." : "Create card + check balance"} onPress={onCreateAndCheck} disabled={loading} />

      {createdId ? (
        <View style={{ marginTop: 10, borderWidth: 1, borderColor: "#333", borderRadius: 12, padding: 12 }}>
          <Text style={{ fontWeight: "700" }}>Created</Text>
          <Text style={{ opacity: 0.7 }}>giftCardId: {createdId}</Text>
          <Text style={{ marginTop: 8, fontSize: 18 }}>Balance: {balanceCents !== null ? `$${(balanceCents / 100).toFixed(2)}` : "—"}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: "auto" }}>
        <Button title="Back to Home" onPress={() => router.back()} />
      </View>
    </View>
  );
}
