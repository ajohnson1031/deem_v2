import { apiFetch } from "@/src/lib/api";
import type { BalanceResponse } from "@/src/lib/contracts";

export type GetWalletBalanceInput = {
  token: string;
};

export async function getWalletBalance({ token }: GetWalletBalanceInput) {
  return apiFetch<BalanceResponse>("/balance", {
    method: "GET",
    token,
  });
}
