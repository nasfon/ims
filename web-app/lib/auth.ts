import "server-only";

import { redirect } from "next/navigation";

import type { RoleSlug } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type AuthSessionUser = {
  id: string;
  email: string | undefined;
  full_name: string;
  is_active: boolean;
  shop_id: string | null;
  role_id: string | null;
  role_slug: RoleSlug | null;
  shop_name: string | null;
};

export type AuthSession = {
  user: AuthSessionUser;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/**
 * Resolves the current session + the user's profile (role + shop).
 * Returns null when there is no authenticated session.
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