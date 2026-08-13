import "server-only";

import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { ROLES, type RoleSlug } from "@/lib/roles";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolvedRole = { role_id: string; role_slug: RoleSlug };

/**
 * Resolves a role from either a `role_id` (uuid) or a `role_slug` into the
 * stored id + canonical slug. Returns an API error response on failure.
 */
export async function resolveUserRole(
  admin: SupabaseClient,
  roleId: string | null,
  roleSlug: RoleSlug | null,
): Promise<ResolvedRole | NextResponse> {
  if (roleId) {
    const { data } = await admin
      .from("roles")
      .select("id, slug")
      .eq("id", roleId)
      .single();
    if (!data) return apiError("Role not found.", 404);
    return { role_id: data.id, role_slug: data.slug as RoleSlug };
  }
  if (roleSlug) {
    const { data } = await admin
      .from("roles")
      .select("id, slug")
      .eq("slug", roleSlug)
      .single();
    if (!data) return apiError("Role not found.", 404);
    return { role_id: data.id, role_slug: data.slug as RoleSlug };
  }
  return apiError("Provide a role (role_id or role_slug).", 400);
}

/**
 * Shop Admins may only grant Shop Admin / Cashier roles (never Super Admin),
 * matching the users RLS `with check` (Security & RBAC §4).
 */
export function canAssignRole(actorRole: RoleSlug | null, assigned: RoleSlug): NextResponse | null {
  if (actorRole !== ROLES.SHOP_ADMIN) return null;
  if (assigned === ROLES.SHOP_ADMIN || assigned === ROLES.CASHIER) return null;
  return apiError("You cannot assign the Super Admin role.", 403);
}