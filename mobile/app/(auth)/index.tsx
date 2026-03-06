// mobile/app/(auth)/index.tsx
import React, { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { API_BASE_URL, apiFetch, AuthVerifyResponse } from "../../src/lib/api";
import { useAuth } from "../../src/state/auth";

export default function AuthScreen() {
  const { setSession } = useAuth();

  const [email, setEmail] = useState("aaron@deem.dev");
  const [code, setCode] = useState("000000");
  const [loading, setLoading] = useState(false);

  const onSignIn = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<AuthVerifyResponse>("/auth/verify", {
        method: "POST",
        body: { email, code },
      });

      await setSession({
        token: res.token,
        userId: res.user.id,
        kycStatus: res.user.kycStatus,
      });
    } catch (e: any) {
      Alert.alert("Sign-in failed", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: "center" }}>
      <Text style={{ fontSize: 28, fontWeight: "700" }}>Deem</Text>
      <Text style={{ opacity: 0.7 }}>API: {API_BASE_URL}</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, borderColor: "#333", padding: 12, borderRadius: 10 }}
      />
      <TextInput value={code} onChangeText={setCode} placeholder="Code (mock: 000000)" style={{ borderWidth: 1, borderColor: "#333", padding: 12, borderRadius: 10 }} />

      <Button title={loading ? "Signing in..." : "Sign in"} onPress={onSignIn} disabled={loading} />
    </View>
  );
}
