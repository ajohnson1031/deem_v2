import { apiFetch } from "@/src/lib/api";
import type { ActivityResponse } from "@/src/lib/contracts";

export type GetActivityInput = {
  token: string;
};

export async function getActivity({ token }: GetActivityInput) {
  return apiFetch<ActivityResponse>("/activity", {
    method: "GET",
    token,
  });
}
