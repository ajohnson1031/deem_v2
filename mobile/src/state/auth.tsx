import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthState = {
  initialized: boolean;
  token: string | null;
  userId: string | null;
  kycStatus: "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED" | null;
  setSession: (args: { token: string; userId: string; kycStatus: AuthState["kycStatus"] }) => Promise<void>;
  signOut: () => Promise<void>;
};

const TOKEN_KEY = "deem:token";
const USER_ID_KEY = "deem:userId";
const KYC_KEY = "deem:kycStatus";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<AuthState["kycStatus"]>(null);

  useEffect(() => {
    (async () => {
      const t = await SecureStore.getItemAsync(TOKEN_KEY);
      const u = await SecureStore.getItemAsync(USER_ID_KEY);
      const k = await SecureStore.getItemAsync(KYC_KEY);

      setToken(t ?? null);
      setUserId(u ?? null);
      setKycStatus((k as any) ?? null);
      setInitialized(true);
    })();
  }, []);

  const setSession: AuthState["setSession"] = async ({ token, userId, kycStatus }) => {
    setToken(token);
    setUserId(userId);
    setKycStatus(kycStatus);

    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_ID_KEY, userId);
    await SecureStore.setItemAsync(KYC_KEY, kycStatus ?? "");
  };

  const signOut: AuthState["signOut"] = async () => {
    setToken(null);
    setUserId(null);
    setKycStatus(null);

    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_ID_KEY);
    await SecureStore.deleteItemAsync(KYC_KEY);
  };

  const value = useMemo<AuthState>(() => ({ initialized, token, userId, kycStatus, setSession, signOut }), [initialized, token, userId, kycStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
