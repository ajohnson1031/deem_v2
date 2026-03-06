import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";

import { checkGiftCardBalance, createGiftCard } from "@/src/api";
import { PrimaryButton, ScreenHeader, SecondaryAction, SectionCard } from "@/src/components/ui";
import { getBalanceCentsFromResponse, normalizeLast4 } from "@/src/features/giftCards/addCard";
import { getAppErrorCopy } from "@/src/lib/errors";
import { useAuth } from "@/src/state/auth";

export default function AddCardScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [type, setType] = useState<"OPEN_LOOP" | "STORE">("OPEN_LOOP");
  const [brand, setBrand] = useState("Visa");
  const [last4, setLast4] = useState("1234");

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "creating" | "checking">("idle");

  const cleanedLast4 = useMemo(() => normalizeLast4(last4), [last4]);

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

      const balance = await checkGiftCardBalance({
        token,
        giftCardId,
      });

      const balanceCents = getBalanceCentsFromResponse(balance);

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

  const loadingLabel =
    stage === "creating" ? "Saving card…" : stage === "checking" ? "Checking balance…" : "Working…";

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <ScreenHeader
          title="Add Card"
          subtitle="Add a gift card and we’ll check the balance before taking you to the quote screen."
        />

        <SectionCard>
          <Text style={{ opacity: 0.7, marginBottom: 12 }}>Type: {type}</Text>

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

          <Text style={{ fontWeight: "800", marginTop: 16, marginBottom: 6 }}>Brand</Text>
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

          <Text style={{ fontWeight: "800", marginTop: 16, marginBottom: 6 }}>Last 4</Text>
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
        </SectionCard>

        <SectionCard>
          <Text style={{ fontWeight: "800" }}>What happens next</Text>
          <Text style={{ marginTop: 6, opacity: 0.75, lineHeight: 20 }}>
            We’ll save the card, check the balance, and take you straight to the quote screen with
            the amount prefilled.
          </Text>
        </SectionCard>

        <PrimaryButton
          label={loading ? loadingLabel : "Create card + continue"}
          onPress={onCreateAndCheck}
          disabled={loading}
          loading={false}
        />

        {loading ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              justifyContent: "center",
            }}
          >
            <ActivityIndicator />
            <Text style={{ fontWeight: "900" }}>{loadingLabel}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: "auto" }}>
          <SecondaryAction label="Back to Home" onPress={() => router.back()} disabled={loading} />
        </View>
      </View>
    </SafeAreaView>
  );
}
