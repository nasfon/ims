import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env";

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error(
    "Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY). Load them from .env.local.",
  );
}

const SUPABASE_URL: string = url;
const SUPABASE_ANON_KEY: string = anonKey;
const SUPABASE_SERVICE_ROLE_KEY: string = serviceKey;

/** Service-role client: bypasses RLS. Use ONLY for test setup/teardown. */
export const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Anonymous client (anon key, no session) — represents an unauthenticated caller. */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client authenticated as a specific user via their access/refresh tokens. */
export async function authedClient(
  accessToken: string,
  refreshToken: string,
): Promise<SupabaseClient> {
  const client = anonClient();
  await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  return client;
}

export type RoleSlugs = "super_admin" | "shop_admin" | "cashier";

export async function getRoleIds(): Promise<Record<RoleSlugs, string>> {
  const { data, error } = await admin.from("roles").select("id, slug");
  if (error) throw error;
  const map = {} as Record<RoleSlugs, string>;
  for (const row of data ?? []) {
    map[row.slug as RoleSlugs] = row.id as string;
  }
  return map;
}

export async function createTestShop(name: string): Promise<string> {
  const { data, error } = await admin
    .from("shops")
    .insert({ name })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteTestShop(id: string): Promise<void> {
  await admin.from("shops").delete().eq("id", id);
}

export type CreatedUser = {
  authId: string;
  email: string;
  password: string;
  shopId: string;
};

export async function createTestUser(opts: {
  email: string;
  password: string;
  fullName: string;
  shopId: string;
  roleId: string;
}): Promise<CreatedUser> {
  const { data, error } = await admin.auth.admin.createUser({
    email: opts.email,
    password: opts.password,
    email_confirm: true,
    user_metadata: { full_name: opts.fullName },
  });
  if (error) throw error;
  const authId = data.user!.id;
  const { error: profileError } = await admin.from("users").insert({
    id: authId,
    shop_id: opts.shopId,
    role_id: opts.roleId,
    full_name: opts.fullName,
    is_active: true,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(authId).catch(() => {});
    throw profileError;
  }
  return {
    authId,
    email: opts.email,
    password: opts.password,
    shopId: opts.shopId,
  };
}

export async function deleteTestUser(authId: string): Promise<void> {
  await admin.from("users").delete().eq("id", authId);
  await admin.auth.admin.deleteUser(authId).catch(() => {});
}

export async function signIn(email: string, password: string): Promise<{
  client: SupabaseClient;
  accessToken: string;
  refreshToken: string;
}> {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return {
    client,
    accessToken: data.session!.access_token,
    refreshToken: data.session!.refresh_token,
  };
}
