"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  Sale,
  SaleFormValues,
  SalesResponse,
} from "@/types/sales";

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

export type SalesQueryParams = {
  page: number;
  limit: number;
  search: string;
  sort: string;
  sortDir: "asc" | "desc";
  status: string;
  paymentMethod: string;
};

export function useSales(params: SalesQueryParams) {
  return useQuery({
    queryKey: ["sales", params],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
        search: params.search,
        sort: params.sort,
        sortDir: params.sortDir,
        status: params.status,
        payment_method: params.paymentMethod,
      });
      return requestJson<SalesResponse>(`/api/v1/sales?${qs.toString()}`);
    },
  });
}

export function useSale(saleId: string | null) {
  return useQuery({
    queryKey: ["sale", saleId],
    queryFn: () => requestJson<Sale>(`/api/v1/sales/${saleId}`),
    enabled: !!saleId,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: SaleFormValues) =>
      requestJson<Sale>("/api/v1/sales", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}