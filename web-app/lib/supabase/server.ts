import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/env";

const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

/**
 * Supabase client for Server Components / Server Actions / Route Handlers.
 * Reads the session from the request/response cookie jar and can persist
 * session cookies set by Supabase Auth (login/logout/refresh).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie);
          }
        } catch {
          // Called from a Server Component. Safe to ignore if proxy.ts
          // refreshes sessions; it will set cookies in the response.
        }
      },
    },
  });
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-only admin client using the service role key.
 * Bypasses RLS. NEVER import this from a client component.
 */
export function createServerAdminClient() {
  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. This is a server-only secret — set it in your environment (never in NEXT_PUBLIC_ variables).",
    );
  }
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}