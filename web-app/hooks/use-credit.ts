"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  CreditPaymentInput,
  CreditPaymentRecordedResponse,
  CustomersResponse,
} from "@/types/customers";

export type ApiError = Error & { errors?: Record<string, string> };

async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const err = new Error(json.message ?? "Request failed.") as ApiError;
    if (json.errors) err.errors = json.errors;
    throw err;
  }
  return json.data as T;
}

export type CreditsQueryParams = {
  page: number;
  limit: number;
  search: string;
};

/** Outstanding credit book: customers with total_credit > 0. */
export function useOutstandingCredits(params: CreditsQueryParams) {
  return useQuery({
    queryKey: ["credits", params],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
        search: params.search,
      });
      return requestJson<CustomersResponse>(`/api/v1/credits?${qs.toString()}`);
    },
  });
}

export function useCreateCreditPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreditPaymentInput) => {
      const body: Record<string, unknown> = {
        customerId: input.customerId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
      };
      if (input.saleId) body.saleId = input.saleId;
      return requestJson<CreditPaymentRecordedResponse>("/api/v1/credits/payments", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credits"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer-credit"] });
    },
  });
}