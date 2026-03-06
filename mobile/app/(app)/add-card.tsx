import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, Text, TextInput, View } from "react-native";

import { checkGiftCardBalance, createGiftCard } from "@/src/api";
import type { GiftCardBalanceResponse } from "@/src/lib/contracts";
import { getAppErrorCopy } from "@/src/lib/errors";
import { useAuth } from "@/src/state/auth";

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function toCentsMaybe(value: any): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  if (Number.isInteger(value) && value >= 50) return value;

  return Math.round(value * 100);
}

function getBalanceCentsFromResponse(res: GiftCardBalanceResponse): number | null {
  const candidates = [res?.balance?.cents, res?.balanceCents, res?.giftCard?.balanceCents, res?.giftCard?.balanceUsd, res?.balanceUsd];

  for (const c of candidates) {
    const cents = toCentsMaybe(c);
    if (typeof cents === "number" && Number.isFinite(cents)) return cents;
  }

  return null;
}

export default function AddCardScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [type, setType] = useState<"OPEN_LOOP" | "STORE">("OPEN_LOOP");
  const [brand, setBrand] = useState("Visa");
  const [last4, setLast4] = useState("1234");

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "creating" | "checking">("idle");

  const cleanedLast4 = useMemo(() => normalizeDigits(last4).slice(0, 4), [last4]);

  async function onCreateAndCheck() {
    if (!token) return;

    if (!brand.trim()) {
      Alert.alert("Missing brand", "Enter a gift card brand (e.g. Visa).");
      return;
    }

    if (cleanedLast4.length !== 4) {
      Alert.alert("Invalid last 4", "Please enter exactly 4 digits.");
      return;
    }

    try {
      setLoading(true);
      setStage("creating");

      const created = await createGiftCard({
        token,
        body: {
          type,
          brand: brand.trim(),
          last4: cleanedLast4,
        },
      });

      const giftCardId = created?.giftCard?.id;

      if (!giftCardId) {
        Alert.alert("Error", "Gift card created but no id was returned.");
        return;
      }

      setStage("checking");

      const bal = await checkGiftCardBalance({
        token,
        giftCardId,
      });

      const balanceCents = getBalanceCentsFromResponse(bal);

      if (balanceCents == null) {
        Alert.alert("Balance unavailable", "We couldn’t read a balance amount from the response.");
        return;
      }

      router.replace({
        pathname: "/(app)/quote-confirm",
        params: {
          giftCardId,
          prefillCents: String(balanceCents),
        },
      });
    } catch (e: any) {
      const copy = getAppErrorCopy(e, "Unable to add card");
      Alert.alert(copy.title, copy.message);
    } finally {
      setStage("idle");
      setLoading(false);
    }
  }

  const loadingLabel = stage === "creating" ? "Saving card…" : stage === "checking" ? "Checking balance…" : "Working…";

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>Add Card</Text>

        <Text style={{ opacity: 0.7 }}>Type (manual toggle): {type}</Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            onPress={() => setType("OPEN_LOOP")}
            disabled={loading}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#333",
              backgroundColor: type === "OPEN_LOOP" ? "#fff" : "transparent",
              alignItems: "center",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Text style={{ fontWeight: "800" }}>Open-loop</Text>
          </Pressable>

          <Pressable
            onPress={() => setType("STORE")}
            disabled={loading}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#333",
              backgroundColor: type === "STORE" ? "#fff" : "transparent",
              alignItems: "center",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Text style={{ fontWeight: "800" }}>Store</Text>
          </Pressable>
        </View>

        <TextInput
          value={brand}
          onChangeText={setBrand}
          placeholder="Brand (e.g. Visa)"
          editable={!loading}
          autoCapitalize="words"
          style={{
            borderWidth: 1,
            borderColor: "#333",
            padding: 12,
            borderRadius: 10,
          }}
        />

        <TextInput
          value={last4}
          onChangeText={setLast4}
          placeholder="Last 4"
          maxLength={4}
          keyboardType="number-pad"
          editable={!loading}
          style={{
            borderWidth: 1,
            borderColor: "#333",
            padding: 12,
            borderRadius: 10,
          }}
        />

        <Pressable
          onPress={onCreateAndCheck}
          disabled={loading}
          style={{
            marginTop: 6,
            backgroundColor: "#fff",
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator />
              <Text style={{ fontWeight: "900" }}>{loadingLabel}</Text>
            </View>
          ) : (
            <Text style={{ fontWeight: "900" }}>Create card + continue</Text>
          )}
        </Pressable>

        <View
          style={{
            marginTop: 6,
            borderWidth: 1,
            borderColor: "#333",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Text style={{ fontWeight: "800" }}>What happens next</Text>
          <Text style={{ marginTop: 6, opacity: 0.75, lineHeight: 20 }}>
            We’ll save the card, check the balance, and take you straight to the quote screen with the amount prefilled.
          </Text>
        </View>

        <View style={{ marginTop: "auto" }}>
          <Pressable
            onPress={() => router.back()}
            disabled={loading}
            style={{
              paddingVertical: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#333",
              alignItems: "center",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Text style={{ fontWeight: "800" }}>Back to Home</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
