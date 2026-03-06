import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, Text, View } from "react-native";

import { completeBankLink, createPayout, startBankLink } from "@/src/api";
import { getAppErrorCopy } from "@/src/lib/errors";
import { useAuth } from "@/src/state/auth";

export default function LinkBankScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    conversionId?: string;
    returnToQuote?: string;
    giftCardId?: string;
    amountCents?: string;
  }>();

  const { token } = useAuth();

  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) return;

      setLoadingStart(true);

      try {
        const res = await startBankLink({ token });

        if (!cancelled) {
          setLinkToken(res.linkToken);
        }
      } catch (e: any) {
        if (!cancelled) {
          const copy = getAppErrorCopy(e, "Link start failed");
          Alert.alert(copy.title, copy.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingStart(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onComplete() {
    if (!token) return;

    setLoadingComplete(true);

    try {
      const res = await completeBankLink({ token });
      const bankId = res.bankAccount.id;

      if (params.conversionId) {
        await createPayout({
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

      if (params.returnToQuote === "1") {
        router.replace({
          pathname: "/(app)/quote-confirm",
          params: {
            giftCardId: params.giftCardId ?? "",
            prefillCents: params.amountCents ?? "",
            refreshBanks: "1",
          },
        });

        return;
      }

      router.back();
    } catch (e: any) {
      const copy = getAppErrorCopy(e, "Link failed");
      Alert.alert(copy.title, copy.message);
    } finally {
      setLoadingComplete(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Link Bank</Text>

      <Text style={{ marginTop: 6, opacity: 0.75, lineHeight: 20 }}>This mock screen simulates a Plaid connection and creates a linked bank account for the current user.</Text>

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
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8, opacity: 0.75 }}>Requesting link token…</Text>
          </View>
        ) : (
          <>
            <Text style={{ fontWeight: "800" }}>Link token</Text>

            <Text style={{ marginTop: 8, opacity: 0.8 }}>{linkToken ?? "(none)"}</Text>

            <Pressable
              onPress={onComplete}
              disabled={loadingComplete}
              style={{
                marginTop: 14,
                backgroundColor: "#fff",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                opacity: loadingComplete ? 0.6 : 1,
              }}
            >
              {loadingComplete ? <ActivityIndicator /> : <Text style={{ fontWeight: "900" }}>Complete link</Text>}
            </Pressable>
          </>
        )}
      </View>

      <View
        style={{
          marginTop: 16,
          borderWidth: 1,
          borderColor: "#333",
          borderRadius: 16,
          padding: 14,
        }}
      >
        <Text style={{ fontWeight: "800" }}>What happens next</Text>

        {params.conversionId ? (
          <Text style={{ marginTop: 8, opacity: 0.75, lineHeight: 20 }}>
            After linking, we’ll attach this bank to your current conversion and continue the payout flow automatically.
          </Text>
        ) : params.returnToQuote === "1" ? (
          <Text style={{ marginTop: 8, opacity: 0.75, lineHeight: 20 }}>
            After linking, we’ll return you to the quote screen and refresh your available bank accounts automatically.
          </Text>
        ) : (
          <Text style={{ marginTop: 8, opacity: 0.75, lineHeight: 20 }}>After linking, this bank account will be available as a cashout destination in Deem.</Text>
        )}
      </View>

      <Pressable
        onPress={() => router.back()}
        disabled={loadingComplete}
        style={{
          marginTop: 16,
          alignItems: "center",
          paddingVertical: 12,
          opacity: loadingComplete ? 0.6 : 1,
        }}
      >
        <Text style={{ opacity: 0.7 }}>Cancel</Text>
      </Pressable>
    </SafeAreaView>
  );
}
