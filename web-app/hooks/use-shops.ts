"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { Shop, ShopInput } from "@/lib/shops";

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

export function useShops() {
  return useQuery({
    queryKey: ["shops"],
    queryFn: () => requestJson<Shop[]>("/api/v1/shops"),
  });
}

export function useShop(shopId: string | null) {
  return useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => requestJson<Shop>(`/api/v1/shops/${shopId}`),
    enabled: !!shopId,
  });
}

export function useCreateShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ShopInput) =>
      requestJson<Shop>("/api/v1/shops", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shops"] });
    },
  });
}

export function useUpdateShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shopId, input }: { shopId: string; input: Partial<ShopInput> }) =>
      requestJson<Shop>(`/api/v1/shops/${shopId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shops"] });
    },
  });
}

export function useDeleteShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shopId: string) =>
      requestJson<{ id: string }>(`/api/v1/shops/${shopId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shops"] });
    },
  });
}
