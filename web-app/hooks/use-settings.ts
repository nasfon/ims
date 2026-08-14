"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  BusinessSettings,
  BusinessSettingsUpdate,
} from "@/types/settings";

export type ApiError = Error & { errors?: Record<string, string> };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
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

export function useBusinessSettings(shopId: string) {
  return useQuery({
    queryKey: ["business-settings", shopId],
    queryFn: () =>
      requestJson<BusinessSettings>(
        `/api/v1/settings/business${shopId ? `?shop_id=${encodeURIComponent(shopId)}` : ""}`,
      ),
  });
}

export function useUpdateBusinessSettings(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: BusinessSettingsUpdate) =>
      requestJson<BusinessSettings>(
        `/api/v1/settings/business${shopId ? `?shop_id=${encodeURIComponent(shopId)}` : ""}`,
        {
          method: "PATCH",
          body: JSON.stringify(values),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-settings"] });
      qc.invalidateQueries({ queryKey: ["shops"] });
    },
  });
}