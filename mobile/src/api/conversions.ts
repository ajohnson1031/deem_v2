import { apiFetch } from "@/src/lib/api";
import type { ConversionTimelineResponse, CreateConversionResponse } from "@/src/lib/contracts";

export type CreateConversionInput = {
  token: string;
  body: {
    quoteId: string;
    bankAccountId?: string;
  };
};

export type GetConversionTimelineInput = {
  token: string;
  conversionId: string;
};

export async function createConversion({ token, body }: CreateConversionInput) {
  return apiFetch<CreateConversionResponse>("/conversions", {
    method: "POST",
    token,
    body,
  });
}

export async function getConversionTimeline({ token, conversionId }: GetConversionTimelineInput) {
  return apiFetch<ConversionTimelineResponse>(`/conversions/${conversionId}/timeline`, {
    method: "GET",
    token,
  });
}
