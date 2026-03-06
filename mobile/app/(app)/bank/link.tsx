import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, Text, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { apiFetch } from "@/src/lib/api";
import { useAuth } from "@/src/state/auth";

type LinkStartResponse = {
  linkToken: string;
};

type LinkCompleteResponse = {
  bankAccount: {
    id: string;
    displayLabel?: string;
    masked?: string;
  };
};

export default function LinkBankScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    conversionId?: string;
  }>();

  const { token } = useAuth();

  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);

  useEffect(() => {
    async function run() {
      if (!token) return;

      setLoadingStart(true);

      try {
        const res = await apiFetch<LinkStartResponse>("/bank/link/start", { method: "POST", token });

        setLinkToken(res.linkToken);
      } catch (e: any) {
        Alert.alert("Link start failed", e?.message ?? "Unable to start bank linking.");
      } finally {
        setLoadingStart(false);
      }
    }

    run();
  }, [token]);

  async function onComplete() {
    if (!token) return;

    setLoadingComplete(true);

    try {
      const res = await apiFetch<LinkCompleteResponse>("/bank/link/complete", {
        method: "POST",
        token,
        body: {
          publicToken: "mock-public-token",
          institutionName: "Mock Bank",
          accountMask: "1234",
        },
      });

      const bankId = res.bankAccount.id;

      if (params.conversionId) {
        await apiFetch("/payouts", {
          method: "POST",
          token,
          body: {
            conversionId: params.conversionId,
            bankAccountId: bankId,
          },
        });

        router.replace({
          pathname: "/(app)/conversions/[id]",
          params: { id: params.conversionId },
        });

        return;
      }

      router.back();
    } catch (e: any) {
      Alert.alert("Link failed", e?.message ?? "Unable to complete bank linking.");
    } finally {
      setLoadingComplete(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Link Bank</Text>

      <Text style={{ marginTop: 6, opacity: 0.75 }}>This mock screen simulates a Plaid connection.</Text>

      <View
        style={{
          marginTop: 16,
          borderWidth: 1,
          borderColor: "#333",
          borderRadius: 16,
          padding: 14,
        }}
      >
        {loadingStart ? (
          <View style={{ alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8 }}>Requesting link token…</Text>
          </View>
        ) : (
          <>
            <Text style={{ fontWeight: "800" }}>Link token</Text>

            <Text style={{ marginTop: 8 }}>{linkToken ?? "(none)"}</Text>

            <Pressable
              onPress={onComplete}
              disabled={loadingComplete}
              style={{
                marginTop: 14,
                backgroundColor: "#fff",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              {loadingComplete ? <ActivityIndicator /> : <Text style={{ fontWeight: "900" }}>Complete link</Text>}
            </Pressable>
          </>
        )}
      </View>

      <Pressable onPress={() => router.back()} style={{ marginTop: 16, alignItems: "center" }}>
        <Text style={{ opacity: 0.7 }}>Cancel</Text>
      </Pressable>
    </SafeAreaView>
  );
}
