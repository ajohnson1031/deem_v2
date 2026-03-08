import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { STORAGE_KEYS } from "@/src/lib/storageKeys";

type KycStatus = "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED" | null;

type AuthContextValue = {
  booting: boolean;
  token: string | null;
  userId: string | null;
  kycStatus: KycStatus;
  isAuthenticated: boolean;
  signIn: (payload: { token: string; userId: string; kycStatus?: KycStatus }) => Promise<void>;
  signOut: () => Promise<void>;
  setKycStatus: (value: KycStatus) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function setStoredItem(key: string, value: string | null) {
  if (!value) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [kycStatus, setKycStatusState] = useState<KycStatus>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const [storedToken, storedUserId, storedKyc] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEYS.TOKEN),
          SecureStore.getItemAsync(STORAGE_KEYS.USER_ID),
          SecureStore.getItemAsync(STORAGE_KEYS.KYC_STATUS),
        ]);

        if (cancelled) return;

        setToken(storedToken ?? null);
        setUserId(storedUserId ?? null);
        setKycStatusState((storedKyc as KycStatus) ?? null);
      } catch (error) {
        console.warn("Failed to hydrate auth state from SecureStore", error);

        if (cancelled) return;

        setToken(null);
        setUserId(null);
        setKycStatusState(null);
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  async function signIn(payload: { token: string; userId: string; kycStatus?: KycStatus }) {
    const nextKyc = payload.kycStatus ?? null;

    await Promise.all([
      setStoredItem(STORAGE_KEYS.TOKEN, payload.token),
      setStoredItem(STORAGE_KEYS.USER_ID, payload.userId),
      setStoredItem(STORAGE_KEYS.KYC_STATUS, nextKyc),
    ]);

    setToken(payload.token);
    setUserId(payload.userId);
    setKycStatusState(nextKyc);
  }

  async function signOut() {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ID),
      SecureStore.deleteItemAsync(STORAGE_KEYS.KYC_STATUS),
    ]);

    setToken(null);
    setUserId(null);
    setKycStatusState(null);
  }

  async function setKycStatus(value: KycStatus) {
    await setStoredItem(STORAGE_KEYS.KYC_STATUS, value);
    setKycStatusState(value);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      booting,
      token,
      userId,
      kycStatus,
      isAuthenticated: Boolean(token),
      signIn,
      signOut,
      setKycStatus,
    }),
    [booting, token, userId, kycStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return ctx;
}
