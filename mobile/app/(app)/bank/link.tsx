import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, Text, View } from "react-native";

import { completeBankLink, createPayout, startBankLink } from "@/src/api";
import { PrimaryButton, ScreenHeader, SecondaryAction, SectionCard } from "@/src/components/ui";
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
      <ScreenHeader
        title="Link Bank"
        subtitle="This mock screen simulates a Plaid connection and creates a linked bank account for the current user."
      />

      <SectionCard style={{ marginTop: 16 }}>
        {loadingStart ? (
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8, opacity: 0.75 }}>Requesting link token…</Text>
          </View>
        ) : (
          <>
            <Text style={{ fontWeight: "800" }}>Link token</Text>

            <Text style={{ marginTop: 8, opacity: 0.8 }}>{linkToken ?? "(none)"}</Text>

            <PrimaryButton
              label="Complete link"
              onPress={onComplete}
              disabled={loadingComplete}
              loading={loadingComplete}
              style={{ marginTop: 14 }}
            />
          </>
        )}
      </SectionCard>

      <SectionCard style={{ marginTop: 16 }}>
        <Text style={{ fontWeight: "800" }}>What happens next</Text>

        {params.conversionId ? (
          <Text style={{ marginTop: 8, opacity: 0.75, lineHeight: 20 }}>
            After linking, we’ll attach this bank to your current conversion and continue the payout
            flow automatically.
          </Text>
        ) : params.returnToQuote === "1" ? (
          <Text style={{ marginTop: 8, opacity: 0.75, lineHeight: 20 }}>
            After linking, we’ll return you to the quote screen and refresh your available bank
            accounts automatically.
          </Text>
        ) : (
          <Text style={{ marginTop: 8, opacity: 0.75, lineHeight: 20 }}>
            After linking, this bank account will be available as a cashout destination in Deem.
          </Text>
        )}
      </SectionCard>

      <SecondaryAction label="Cancel" onPress={() => router.back()} disabled={loadingComplete} />
    </SafeAreaView>
  );
}
