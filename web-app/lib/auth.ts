import "server-only";

import { redirect } from "next/navigation";

import type { AuthSessionUser } from "@/types/auth";
import type { RoleSlug } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type { AuthSessionUser };

export type AuthSession = {
  user: AuthSessionUser;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/**
 * Resolves the current session + the user's profile (role + shop).
 * Returns null when there is no authenticated session OR when the user's
 * profile is inactive/soft-deleted.
 *
 * A valid JWT is not enough: deactivated users must be treated as signed out
 * even if their access token is still unexpired (Security & RBAC §7).
 */
export async function getSession(): Promise<AuthSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select(
      "id, full_name, is_active, shop_id, role_id, shop:shops(name), role:roles(slug)",
    )
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    // Best-effort: clear the stale session so the redirect to /login sticks.
    await supabase.auth.signOut().catch(() => {});
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name ?? user.email ?? "User",
      is_active: profile?.is_active ?? false,
      shop_id: profile?.shop_id ?? null,
      role_id: profile?.role_id ?? null,
      role_slug: ((profile as { role?: { slug?: string } | null } | null)?.role?.slug as RoleSlug | undefined) ?? null,
      shop_name: ((profile as { shop?: { name?: string } | null } | null)?.shop?.name as string | undefined) ?? null,
    },
    supabase,
  };
}

/** Returns the session or redirects to /login for authenticated-only pages. */
export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/** Requires a super admin session or redirects to /dashboard. */
export async function requireSuperAdmin(): Promise<AuthSession> {
  const session = await requireSession();
  if (session.user.role_slug !== "super_admin") {
    redirect("/dashboard");
  }
  return session;
}

/** Requires a user-manager session (Super Admin / Shop Admin) or redirects. */
export async function requireUserManager(): Promise<AuthSession> {
  const session = await requireSession();
  if (
    session.user.role_slug !== "super_admin" &&
    session.user.role_slug !== "shop_admin"
  ) {
    redirect("/dashboard");
  }
  return session;
}