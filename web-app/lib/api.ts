import "server-only";

import { NextResponse } from "next/server";

import { getSession, type AuthSession } from "@/lib/auth";
import type { RoleSlug } from "@/lib/roles";

type ApiGuard =
  | { session: AuthSession; error: null }
  | { session: null; error: NextResponse };

/**
 * Resolves the current session for API routes. Returns a 401 JSON response
 * instead of redirecting (unlike `requireSession` for pages).
 */
export async function guardApiUser(): Promise<ApiGuard> {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, message: "Not signed in." },
        { status: 401 },
      ),
    };
  }
  return { session, error: null };
}

/** Standard error response. `errors` is an optional field-level map. */
export function apiError(message: string, status = 400, errors?: unknown) {
  return NextResponse.json(
    { success: false, message, ...(errors ? { errors } : {}) },
    { status },
  );
}

/** Standard success response. */
export function apiSuccess<T>(data: T, message: string, status = 200) {
  return NextResponse.json({ success: true, message, data }, { status });
}

/**
 * Returns null when the session's role is among `roles`, otherwise a 403
 * response. Server-side enforcement (RLS is the source of truth; the route
 * handler is an extra layer for admin-only modules).
 */
export function guardApiRole(session: AuthSession, roles: readonly RoleSlug[]) {
  const role = session.user.role_slug;
  if (role && roles.includes(role)) {
    return null;
  }
  return apiError("You do not have permission to perform this action.", 403);
}