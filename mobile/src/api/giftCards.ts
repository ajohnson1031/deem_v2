import { apiFetch } from "@/src/lib/api";
import type { GiftCardBalanceResponse, GiftCardCreateResponse } from "@/src/lib/contracts";

export type CreateGiftCardInput = {
  token: string;
  body: {
    type: "OPEN_LOOP" | "STORE";
    brand: string;
    last4: string;
  };
};

export type CheckGiftCardBalanceInput = {
  token: string;
  giftCardId: string;
};

export async function createGiftCard({ token, body }: CreateGiftCardInput) {
  return apiFetch<GiftCardCreateResponse>("/gift-cards", {
    method: "POST",
    token,
    body,
  });
}

export async function checkGiftCardBalance({ token, giftCardId }: CheckGiftCardBalanceInput) {
  return apiFetch<GiftCardBalanceResponse>(`/gift-cards/${giftCardId}/balance`, {
    method: "POST",
    token,
    body: {},
  });
}
