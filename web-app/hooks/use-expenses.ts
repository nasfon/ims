"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { Expense, ExpenseFormValues, ExpensesResponse } from "@/types/expenses";

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

export type ExpensesQueryParams = {
  page: number;
  limit: number;
  dateFrom: string;
  dateTo: string;
  sort: string;
  sortDir: "asc" | "desc";
  /** Super Admin only: scope the list to a specific shop. */
  shopId?: string;
};

export function useExpenses(params: ExpensesQueryParams) {
  return useQuery({
    queryKey: ["expenses", params],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
        sort: params.sort,
        sortDir: params.sortDir,
      });
      if (params.dateFrom) qs.set("date_from", params.dateFrom);
      if (params.dateTo) qs.set("date_to", params.dateTo);
      if (params.shopId) qs.set("shop_id", params.shopId);
      return requestJson<ExpensesResponse>(`/api/v1/expenses?${qs.toString()}`);
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseFormValues & { shop_id: string }) =>
      requestJson<Expense>("/api/v1/expenses", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { expenseId: string; values: Partial<ExpenseFormValues> }) =>
      requestJson<Expense>(`/api/v1/expenses/${args.expenseId}`, {
        method: "PATCH",
        body: JSON.stringify(args.values),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) =>
      requestJson<{ id: string }>(`/api/v1/expenses/${expenseId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}