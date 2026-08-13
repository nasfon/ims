import type { NextRequest } from "next/server";

/**
 * Best-effort client IP from the request headers. Honors the proxy chain
 * configured on Vercel (`x-forwarded-for` is a comma-separated list, leftmost
 * entry is the original client).
 */
export function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}