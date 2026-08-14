"use client";

import { useQuery } from "@tanstack/react-query";

import type { AuditLogWithDetails } from "@/lib/audit";

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

export type AuditLogsResponse = {
  items: AuditLogWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type AuditLogsQueryParams = {
  page: number;
  limit: number;
  action: string;
  userId: string;
  dateFrom: string;
  dateTo: string;
};

export function useAuditLogs(params: AuditLogsQueryParams) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
      });
      if (params.action) qs.set("action", params.action);
      if (params.userId) qs.set("user_id", params.userId);
      if (params.dateFrom) qs.set("date_from", params.dateFrom);
      if (params.dateTo) qs.set("date_to", params.dateTo);
      return requestJson<AuditLogsResponse>(`/api/v1/audit-logs?${qs.toString()}`);
    },
  });
}