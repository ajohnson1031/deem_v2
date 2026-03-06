import { Platform } from "react-native";

const defaultBaseUrl = Platform.select({
  ios: "http://localhost:4000",
  android: "http://10.0.2.2:4000",
  default: "http://localhost:4000",
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultBaseUrl;

export type ApiError = {
  status: number;
  message: string;
  payload?: any;
};

type ApiFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string | null;
  body?: any;
  headers?: Record<string, string>;
};

export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.headers ?? {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let json: any = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = text;
  }

  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      message: (json && (json.error || json.message)) || `HTTP ${res.status}`,
      payload: json,
    };
    throw err;
  }

  return json as T;
}

// ---- API types you’ll use in screens ----

export type AuthVerifyResponse = {
  token: string;
  user: { id: string; kycStatus: "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED" };
};

export type BalanceResponse = {
  wallet: {
    id: string;
    xrpDrops: string;
    xrp: string;
  };
};

export type ActivityResponse = {
  items: {
    id: string;
    status: string;
    displayStatus?: string;
    displaySubtitle?: string;
    processingPercent?: number;
    requiresBank?: boolean;
    isTerminal?: boolean;

    createdAt: string;
    updatedAt: string;

    sourceAmount: { cents: number; currency: "USD" };
    fees: { cents: number; currency: "USD" };
    netAmount: { cents: number; currency: "USD" };

    xrpAmount: string | null;

    giftCard: { id: string; brand: string | null; last4: string | null; type: string } | null;
    bankAccount: { id: string; provider: string; last4: string | null } | null;

    failureReason?: string | null;
  }[];
  nextCursor: string | null;
};

export type GiftCardCreateResponse = {
  giftCard: {
    id: string;
    type: "OPEN_LOOP" | "STORE";
    brand: string | null;
    last4: string | null;
    tokenRef: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
  };
};

export type GiftCardBalanceResponse = {
  giftCardId: string;
  balanceUsd: number; // cents
  currency: "USD";
};
