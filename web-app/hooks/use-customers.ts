"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  CustomerCreditResponse,
  CustomerItem,
  CustomerSalesResponse,
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

export type CustomersQueryParams = {
  page: number;
  limit: number;
  search: string;
  sort: string;
  sortDir: "asc" | "desc";
  /** Super Admin only: scope the search to a specific shop. */
  shopId?: string;
};

export function useCustomers(params: CustomersQueryParams) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
        search: params.search,
        sort: params.sort,
        sortDir: params.sortDir,
      });
      if (params.shopId) qs.set("shop_id", params.shopId);
      return requestJson<CustomersResponse>(`/api/v1/customers?${qs.toString()}`);
    },
  });
}

/** Soft-deletes a customer (DELETE /customers/{id}). */
export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) =>
      requestJson<{ id: string }>(`/api/v1/customers/${customerId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useCustomer(customerId: string | null) {
  return useQuery({
    queryKey: ["customer", customerId],
    queryFn: () =>
      requestJson<CustomerItem>(`/api/v1/customers/${customerId}`),
    enabled: !!customerId,
  });
}

export function useCustomerCredit(customerId: string) {
  return useQuery({
    queryKey: ["customer-credit", customerId],
    queryFn: () =>
      requestJson<CustomerCreditResponse>(`/api/v1/customers/${customerId}/credit`),
  });
}

export function useCustomerSales(
  customerId: string,
  params: { page: number; limit: number },
) {
  return useQuery({
    queryKey: ["customer-sales", customerId, params],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
      });
      return requestJson<CustomerSalesResponse>(
        `/api/v1/customers/${customerId}/sales?${qs.toString()}`,
      );
    },
  });
}