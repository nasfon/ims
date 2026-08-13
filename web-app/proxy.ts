import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";

/**
 * Route protection for unauthenticated users (Security & RBAC §4).
 *
 * Next.js 16: this file replaces `middleware.ts`. It runs before route
 * rendering, refreshes the Supabase session cookies, and guards page routes.
 *
 * Rules:
 *  - Unauthenticated users hitting any protected page are sent to /login
 *    (with a `next` param so they land back where they started).
 *  - Authenticated users visiting /login (or /) are sent to /dashboard.
 *  - API routes are left to their own auth guards and excluded here.
 */
const PROTECTED_PATHS = [
  "/dashboard",
  "/products",
  "/customers",
  "/sales",
  "/credit-book",
  "/expenses",
  "/reports",
  "/audit-logs",
  "/users",
  "/shops",
  "/settings",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname.startsWith(`${path}/`) || pathname === path,
  );
}

export async function proxy(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  const response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Forward cookie updates to the browser. If a cookie to set is
        // `null`, the session was cleared (e.g. signed out).
        for (const { name, value, options } of cookiesToSet) {
          if (value === undefined || value === null) {
            request.cookies.delete(name);
            response.cookies.delete(name);
          } else {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user) {
    // Public pages: no redirect needed.
    if (pathname === "/login" || pathname === "/") {
      return response;
    }

    // Everything else in the app requires a session.
    if (isProtectedPath(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  // Authenticated: keep sessions out of /login and the root.
  if (pathname === "/login" || pathname === "/") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/dashboard";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /api routes (they enforce their own auth)
     * - Next.js static assets and image optimizer
     * - static files (favicon, public/*, fonts, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};