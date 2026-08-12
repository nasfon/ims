import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";

const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

/**
 * Next 16 "proxy" (formerly middleware) client: refreshes the
 * Supabase session cookie on every matched request.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const cookie of cookiesToSet) {
          supabaseResponse.cookies.set(cookie);
        }
      },
    },
  });

  // Refresh the session (and cookies) if expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}