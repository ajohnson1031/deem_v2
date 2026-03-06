import { apiFetch } from "@/src/lib/api";
import type { QuoteResponse } from "@/src/lib/contracts";

export type CreateQuoteInput = {
  token: string;
  body: {
    giftCardId: string;
    amountCents: number;
  };
};

export async function createQuote({ token, body }: CreateQuoteInput) {
  return apiFetch<QuoteResponse>("/quotes", {
    method: "POST",
    token,
    body,
  });
}
