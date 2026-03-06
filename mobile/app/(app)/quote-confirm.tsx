import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { createConversion, createQuote, getBankAccounts } from "@/src/api";
import { PrimaryButton, ScreenHeader, SecondaryAction, SectionCard } from "@/src/components/ui";
import {
  centsFromUsdString,
  formatUsdFromCents,
  usdStringFromCents,
} from "@/src/features/quotes/quoteConfirm";
import type { BankAccountDto, QuoteResponse } from "@/src/lib/contracts";
import { getAppErrorCopy } from "@/src/lib/errors";
import { useAuth } from "@/src/state/auth";

export default function QuoteConfirmScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    giftCardId?: string;
    prefillCents?: string;
    refreshBanks?: string;
  }>();

  const { token } = useAuth();

  const giftCardId = params.giftCardId ?? "";
  const prefillCents = params.prefillCents ? parseInt(params.prefillCents, 10) : 0;

  const [amountUsd, setAmountUsd] = useState(
    prefillCents ? usdStringFromCents(prefillCents) : "25.00",
  );

  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingConvert, setLoadingConvert] = useState(false);

  const [quote, setQuote] = useState<QuoteResponse | null>(null);

  const [banksLoading, setBanksLoading] = useState(false);
  const [banks, setBanks] = useState<BankAccountDto[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  const amountCents = useMemo(() => centsFromUsdString(amountUsd), [amountUsd]);

  async function loadBanks() {
    if (!token) return;

    setBanksLoading(true);

    try {
      const response = await getBankAccounts({ token });
      const list = Array.isArray(response) ? response : response.accounts;

      setBanks(list ?? []);

      if (list?.length) {
        setSelectedBankId((prev) => prev ?? list[list.length - 1].id);
      } else {
        setSelectedBankId(null);
      }
    } catch {
      setBanks([]);
      setSelectedBankId(null);
    } finally {
      setBanksLoading(false);
    }
  }

  useEffect(() => {
    loadBanks();
  }, [token]);

  useEffect(() => {
    if (params.refreshBanks === "1") {
      loadBanks();
    }
  }, [params.refreshBanks]);

  async function onGetQuote() {
    if (!token) return;

    if (!giftCardId) {
      Alert.alert("Missing gift card", "No gift card was provided for this quote.");
      return;
    }

    if (!amountCents || amountCents <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than $0.00.");
      return;
    }

    setLoadingQuote(true);

    try {
      const response = await createQuote({
        token,
        body: {
          giftCardId,
          amountCents,
        },
      });

      setQuote(response);
    } catch (e: any) {
      const copy = getAppErrorCopy(e, "Quote failed");
      Alert.alert(copy.title, copy.message);
    } finally {
      setLoadingQuote(false);
    }
  }

  async function onConfirm() {
    if (!token) return;

    if (!quote?.quote?.id) {
      Alert.alert("Missing quote", "Please generate a quote first.");
      return;
    }

    setLoadingConvert(true);

    try {
      const response = await createConversion({
        token,
        body: {
          quoteId: quote.quote.id,
          ...(selectedBankId ? { bankAccountId: selectedBankId } : {}),
        },
      });

      router.replace({
        pathname: "/(app)/conversions/[id]",
        params: { id: response.conversion.id },
      });
    } catch (e: any) {
      const copy = getAppErrorCopy(e, "Conversion failed");
      Alert.alert(copy.title, copy.message);
    } finally {
      setLoadingConvert(false);
    }
  }

  const selectedBank = banks.find((b) => b.id === selectedBankId) ?? null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 28,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="Quote"
          subtitle="Review the amount to convert from this gift card, then generate a quote before confirming."
        />

        <SectionCard style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: "800" }}>Amount (USD)</Text>

          <TextInput
            value={amountUsd}
            onChangeText={(text) => {
              setAmountUsd(text);
              if (quote) setQuote(null);
            }}
            keyboardType="decimal-pad"
            placeholder="25.00"
            style={{
              borderWidth: 1,
              borderColor: "#333",
              borderRadius: 10,
              padding: 12,
              marginTop: 8,
            }}
          />

          <Text style={{ marginTop: 8, opacity: 0.7 }}>
            Parsed amount: {formatUsdFromCents(amountCents)}
          </Text>
        </SectionCard>

        <SectionCard style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: "800" }}>Cashout destination (optional)</Text>
          <Text style={{ marginTop: 6, opacity: 0.72, lineHeight: 20 }}>
            If you select a bank now, the payout can continue without pausing later.
          </Text>

          {banksLoading ? (
            <View style={{ marginTop: 12, alignItems: "center" }}>
              <ActivityIndicator />
              <Text style={{ marginTop: 8, opacity: 0.7 }}>Loading linked banks…</Text>
            </View>
          ) : banks.length === 0 ? (
            <>
              <Text style={{ marginTop: 10, opacity: 0.7 }}>No banks linked yet.</Text>

              <PrimaryButton
                label="Link a bank"
                onPress={() =>
                  router.push({
                    pathname: "/(app)/bank/link",
                    params: {
                      returnToQuote: "1",
                      giftCardId,
                      amountCents: amountCents.toString(),
                    },
                  })
                }
                style={{ marginTop: 12 }}
              />
            </>
          ) : (
            <>
              <FlatList
                scrollEnabled={false}
                style={{ marginTop: 12 }}
                data={banks}
                keyExtractor={(bank) => bank.id}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                renderItem={({ item }) => {
                  const selected = item.id === selectedBankId;

                  return (
                    <Pressable
                      onPress={() => setSelectedBankId(item.id)}
                      style={{
                        borderWidth: 1,
                        borderColor: "#333",
                        borderRadius: 12,
                        padding: 12,
                        backgroundColor: selected ? "#fff" : "transparent",
                      }}
                    >
                      <Text style={{ fontWeight: "800" }}>
                        {item.displayLabel ?? "Bank Account"}
                      </Text>

                      {item.masked ? (
                        <Text style={{ marginTop: 4, opacity: 0.7 }}>•••• {item.masked}</Text>
                      ) : null}
                    </Pressable>
                  );
                }}
              />

              <SecondaryAction
                label="Continue without bank"
                onPress={() => setSelectedBankId(null)}
              />
            </>
          )}

          {selectedBank ? (
            <SectionCard style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: "800" }}>Selected destination</Text>
              <Text style={{ marginTop: 6, opacity: 0.75 }}>
                {selectedBank.displayLabel ?? "Bank Account"}
                {selectedBank.masked ? ` •••• ${selectedBank.masked}` : ""}
              </Text>
            </SectionCard>
          ) : null}
        </SectionCard>

        <PrimaryButton
          label="Get Quote"
          onPress={onGetQuote}
          disabled={loadingQuote || loadingConvert}
          loading={loadingQuote}
          style={{ marginTop: 18 }}
        />

        {quote ? (
          <SectionCard style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "800" }}>Quote Summary</Text>

            <Text style={{ marginTop: 8, opacity: 0.75, lineHeight: 20 }}>
              {quote.ui?.subtitle ??
                "Review your quote details, then confirm to start the conversion."}
            </Text>

            <View style={{ marginTop: 12 }}>
              <Text style={{ opacity: 0.85 }}>Quote ID: {quote.quote.id}</Text>

              {typeof quote.quote.inputCents === "number" ? (
                <Text style={{ marginTop: 6, opacity: 0.85 }}>
                  Input: {formatUsdFromCents(quote.quote.inputCents)}
                </Text>
              ) : (
                <Text style={{ marginTop: 6, opacity: 0.85 }}>
                  Input: {formatUsdFromCents(amountCents)}
                </Text>
              )}

              {typeof quote.quote.outputXrp === "number" ? (
                <Text style={{ marginTop: 6, opacity: 0.85 }}>
                  Estimated XRP: {quote.quote.outputXrp}
                </Text>
              ) : null}

              {quote.ui?.feeLabel ? (
                <Text style={{ marginTop: 6, opacity: 0.85 }}>Fee: {quote.ui.feeLabel}</Text>
              ) : null}

              {quote.ui?.rateLabel ? (
                <Text style={{ marginTop: 6, opacity: 0.85 }}>Rate: {quote.ui.rateLabel}</Text>
              ) : null}

              {quote.ui?.totalLabel ? (
                <Text style={{ marginTop: 6, opacity: 0.85 }}>Total: {quote.ui.totalLabel}</Text>
              ) : null}
            </View>

            <PrimaryButton
              label="Confirm & Start"
              onPress={onConfirm}
              disabled={loadingConvert}
              loading={loadingConvert}
              style={{ marginTop: 14 }}
            />
          </SectionCard>
        ) : null}

        <SecondaryAction
          label="Back"
          onPress={() => router.back()}
          disabled={loadingQuote || loadingConvert}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
