import { apiFetch } from "@/src/lib/api";
import type { BankAccountsResponse, LinkCompleteResponse, LinkStartResponse } from "@/src/lib/contracts";

export type GetBankAccountsInput = {
  token: string;
};

export type StartBankLinkInput = {
  token: string;
};

export type CompleteBankLinkInput = {
  token: string;
  body?: {
    publicToken?: string;
    institutionName?: string;
    accountMask?: string;
  };
};

export type CreatePayoutInput = {
  token: string;
  body: {
    conversionId: string;
    bankAccountId: string;
  };
};

export async function getBankAccounts({ token }: GetBankAccountsInput) {
  return apiFetch<BankAccountsResponse>("/bank/accounts", {
    method: "GET",
    token,
  });
}

export async function startBankLink({ token }: StartBankLinkInput) {
  return apiFetch<LinkStartResponse>("/bank/link/start", {
    method: "POST",
    token,
  });
}

export async function completeBankLink({ token, body }: CompleteBankLinkInput) {
  return apiFetch<LinkCompleteResponse>("/bank/link/complete", {
    method: "POST",
    token,
    body: {
      publicToken: "mock-public-token",
      institutionName: "Mock Bank",
      accountMask: "1234",
      ...body,
    },
  });
}

export async function createPayout({ token, body }: CreatePayoutInput) {
  return apiFetch("/payouts", {
    method: "POST",
    token,
    body,
  });
}
