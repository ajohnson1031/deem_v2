import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, SafeAreaView, Text, TextInput, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { apiFetch } from "@/src/lib/api";
import { useAuth } from "@/src/state/auth";

type QuoteResponse = {
  quote: {
    id: string;
    inputCents?: number;
    outputXrp?: number;
  };
  ui?: {
    subtitle?: string;
    feeLabel?: string;
    rateLabel?: string;
    totalLabel?: string;
  };
};

type CreateConversionResponse = {
  conversion: { id: string };
};

type BankAccount = {
  id: string;
  displayLabel?: string;
  masked?: string;
};

type BankAccountsResponse = { accounts: BankAccount[] } | BankAccount[];

function centsFromUsdString(s: string) {
  const clean = s.replace(/[^\d.]/g, "");
  if (!clean) return 0;

  const [dollars, frac = ""] = clean.split(".");
  const frac2 = (frac + "00").slice(0, 2);

  const n = parseInt(dollars || "0", 10) * 100 + parseInt(frac2 || "0", 10);

  return Number.isFinite(n) ? n : 0;
}

function usdStringFromCents(cents: number) {
  const d = Math.floor(cents / 100);
  const c = String(cents % 100).padStart(2, "0");
  return `${d}.${c}`;
}

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

  const [amountUsd, setAmountUsd] = useState(prefillCents ? usdStringFromCents(prefillCents) : "25.00");

  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingConvert, setLoadingConvert] = useState(false);

  const [quote, setQuote] = useState<QuoteResponse | null>(null);

  const [banksLoading, setBanksLoading] = useState(false);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  const amountCents = useMemo(() => centsFromUsdString(amountUsd), [amountUsd]);

  async function loadBanks() {
    if (!token) return;

    setBanksLoading(true);

    try {
      const res = await apiFetch<BankAccountsResponse>("/bank/accounts", { method: "GET", token });

      const list = Array.isArray(res) ? res : res.accounts;

      setBanks(list ?? []);

      if (list?.length) {
        setSelectedBankId(list[list.length - 1].id);
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
      Alert.alert("Missing gift card");
      return;
    }

    setLoadingQuote(true);

    try {
      const res = await apiFetch<QuoteResponse>("/quotes", {
        method: "POST",
        token,
        body: { giftCardId, amountCents },
      });

      setQuote(res);
    } catch (e: any) {
      Alert.alert("Quote failed", e?.message);
    } finally {
      setLoadingQuote(false);
    }
  }

  async function onConfirm() {
    if (!token || !quote) return;

    setLoadingConvert(true);

    try {
      const body: { quoteId: string; bankAccountId?: string } = {
        quoteId: quote.quote.id,
      };

      if (selectedBankId) body.bankAccountId = selectedBankId;

      const res = await apiFetch<CreateConversionResponse>("/conversions", {
        method: "POST",
        token,
        body,
      });

      router.replace({
        pathname: "/(app)/conversions/[id]",
        params: { id: res.conversion.id },
      });
    } catch (e: any) {
      Alert.alert("Conversion failed", e?.message);
    } finally {
      setLoadingConvert(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Quote</Text>

      <View style={{ marginTop: 16 }}>
        <Text>Amount (USD)</Text>

        <TextInput
          value={amountUsd}
          onChangeText={setAmountUsd}
          keyboardType="decimal-pad"
          style={{
            borderWidth: 1,
            borderColor: "#333",
            borderRadius: 10,
            padding: 12,
            marginTop: 6,
          }}
        />
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={{ fontWeight: "800" }}>Cashout destination (optional)</Text>

        {banksLoading ? (
          <ActivityIndicator />
        ) : banks.length === 0 ? (
          <>
            <Text style={{ marginTop: 6, opacity: 0.7 }}>No banks linked</Text>

            <Pressable
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
              style={{
                marginTop: 10,
                backgroundColor: "#fff",
                borderRadius: 10,
                padding: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "700" }}>Link a bank</Text>
            </Pressable>
          </>
        ) : (
          <FlatList
            style={{ marginTop: 10 }}
            data={banks}
            keyExtractor={(b) => b.id}
            renderItem={({ item }) => {
              const selected = item.id === selectedBankId;

              return (
                <Pressable
                  onPress={() => setSelectedBankId(item.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: "#333",
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 10,
                    backgroundColor: selected ? "#fff" : "transparent",
                  }}
                >
                  <Text style={{ fontWeight: "700" }}>{item.displayLabel ?? "Bank Account"}</Text>

                  {item.masked && <Text style={{ opacity: 0.7 }}>•••• {item.masked}</Text>}
                </Pressable>
              );
            }}
          />
        )}
      </View>

      <Pressable
        onPress={onGetQuote}
        disabled={loadingQuote}
        style={{
          marginTop: 20,
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 14,
          alignItems: "center",
        }}
      >
        {loadingQuote ? <ActivityIndicator /> : <Text style={{ fontWeight: "800" }}>Get Quote</Text>}
      </Pressable>

      {quote && (
        <Pressable
          onPress={onConfirm}
          disabled={loadingConvert}
          style={{
            marginTop: 12,
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 14,
            alignItems: "center",
          }}
        >
          {loadingConvert ? <ActivityIndicator /> : <Text style={{ fontWeight: "800" }}>Confirm & Start</Text>}
        </Pressable>
      )}
    </SafeAreaView>
  );
}
