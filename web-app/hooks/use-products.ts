"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { ProductFormValues, ProductsResponse } from "@/types/products";

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

export type ProductsQueryParams = {
  page: number;
  limit: number;
  search: string;
  sort: string;
  sortDir: "asc" | "desc";
  status: string;
  lowStock: boolean;
  /** Super Admin only: scope the search to a specific shop. */
  shopId?: string;
};

export function useProducts(params: ProductsQueryParams) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
        search: params.search,
        sort: params.sort,
        sortDir: params.sortDir,
        lowStock: String(params.lowStock),
      });
      if (params.status) qs.set("status", params.status);
      if (params.shopId) qs.set("shop_id", params.shopId);
      return requestJson<ProductsResponse>(`/api/v1/products?${qs.toString()}`);
    },
  });
}

/** Soft-deletes a product (DELETE /products/{id}). */
export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      requestJson<{ id: string }>(`/api/v1/products/${productId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export type LowStockQueryParams = {
  page: number;
  limit: number;
  search: string;
  includeInactive: boolean;
};

export function useLowStockProducts(params: LowStockQueryParams) {
  return useQuery({
    queryKey: ["low-stock", params],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
        search: params.search,
        includeInactive: String(params.includeInactive),
      });
      return requestJson<ProductsResponse>(`/api/v1/stock/low?${qs.toString()}`);
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ProductFormValues & { shop_id?: string }) =>
      requestJson<unknown>("/api/v1/products", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: Partial<ProductFormValues>) =>
      requestJson<unknown>(`/api/v1/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}