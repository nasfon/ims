"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  CreditReport,
  ExpensesReport,
  InventoryReport,
  RevenueReport,
  SalesReport,
} from "@/types/reports";

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

export type ReportType = "sales" | "revenue" | "expenses" | "credit" | "inventory";

export type ReportData =
  | SalesReport
  | RevenueReport
  | ExpensesReport
  | CreditReport
  | InventoryReport;

export type ReportQueryParams = {
  /** "YYYY-MM-DD" or ISO timestamp; null = unbounded. */
  startDate: string;
  endDate: string;
  /** Super Admin only. */
  shopId: string;
};

export function useReport(
  type: ReportType,
  params: ReportQueryParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["report", type, params],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params.startDate) qs.set("startDate", params.startDate);
      if (params.endDate) qs.set("endDate", params.endDate);
      if (params.shopId) qs.set("shop_id", params.shopId);
      return requestJson<ReportData>(`/api/v1/reports/${type}?${qs.toString()}`);
    },
    enabled,
  });
}