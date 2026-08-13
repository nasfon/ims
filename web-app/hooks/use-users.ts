"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { UserFormValues, UsersResponse } from "@/types/users";

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

export type UsersQueryParams = {
  page: number;
  limit: number;
  search: string;
  role: string;
};

export function useUsers(params: UsersQueryParams) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
        search: params.search,
        role: params.role,
      });
      return requestJson<UsersResponse>(`/api/v1/users?${qs.toString()}`);
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: UserFormValues) =>
      requestJson<{ temporaryPassword?: string }>("/api/v1/users", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: Partial<UserFormValues>) =>
      requestJson<unknown>(`/api/v1/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/** Activates/deactivates any user row (used by the users table). */
export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, is_active }: { userId: string; is_active: boolean }) =>
      requestJson<unknown>(`/api/v1/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}