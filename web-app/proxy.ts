import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_PATHS = ["/login"];
const API_PREFIX = "/api";

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublicRoute = PUBLIC_PATHS.includes(pathname);
  const isApiRoute = pathname.startsWith(API_PREFIX);
  const isRoot = pathname === "/";

  if (!user && !isPublicRoute && !isApiRoute) {
    // Unauthenticated user hitting a protected page (or root) → login.
    if (isRoot) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url));
  }

  if (user && (isPublicRoute || isRoot)) {
    // Authenticated user heading to login/root → dashboard.
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  // Apply to everything except static assets, images, and the login page.
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};