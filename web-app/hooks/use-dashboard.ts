"use client";

import { useQuery } from "@tanstack/react-query";

import type { DashboardSummary } from "@/types/dashboard";

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

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => requestJson<DashboardSummary>("/api/v1/dashboard"),
    refetchOnWindowFocus: false,
  });
}