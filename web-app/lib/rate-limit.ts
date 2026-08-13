/** Max sign-in attempts per client IP within the sliding window. */
export const LOGIN_MAX_ATTEMPTS = 10;
/** Sliding window for login rate limiting, in milliseconds (5 minutes). */
export const LOGIN_WINDOW_MS = 5 * 60 * 1000;

const buckets = new Map<string, number[]>();
/** Upper bound on tracked keys so the map cannot grow without limit. */
const MAX_BUCKETS = 10_000;

export type RateLimitResult = {
  limited: boolean;
  /** Seconds until the client may retry (0 when not limited). */
  retryAfterSeconds: number;
};

/**
 * Sliding-window rate limiter keyed by an arbitrary string (usually an IP
 * address). Counts attempts within `windowMs`. Intended for in-memory use on
 * login/sensitive endpoints — adequate for Vercel functions, where the
 * primary brute-force protection remains Supabase's own Postgres-backed limit.
 */
export function isRateLimited(
  key: string,
  maxAttempts: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    buckets.clear();
  }

  const attempts = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (attempts.length >= maxAttempts) {
    const oldest = attempts[0] ?? now;
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  attempts.push(now);
  buckets.set(key, attempts);
  return { limited: false, retryAfterSeconds: 0 };
}