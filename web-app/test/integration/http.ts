import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type HeadersLike = { getSetCookie?: () => string[] };

/**
 * Per-request throwaway client IP. All integration tests originate from
 * 127.0.0.1, which would otherwise share a single login rate-limit bucket and
 * trip 429s after ~10 attempts. Spoofing a distinct `x-forwarded-for` per
 * request keeps each attempt in its own bucket (the app trusts this header in
 * dev/test, as it does behind Vercel's proxy).
 */
function randomClientIp(): string {
  const o = () => Math.floor(Math.random() * 256);
  return `${11 + (o() % 240)}.${o()}.${o()}.${1 + (o() % 254)}`;
}

function readBaseUrl(): string {
  const file = resolve(process.cwd(), "test/.integration-server-url");
  if (!existsSync(file)) {
    throw new Error(
      "Integration server URL not found. Ensure the integration globalSetup started the Next server (run via `npm run test:integration`).",
    );
  }
  return readFileSync(file, "utf8").trim();
}

/** The base URL of the running integration server (for raw byte fetches). */
export function serverUrl(): string {
  return readBaseUrl();
}

function getSetCookie(res: Response): string[] {
  const headers = res.headers as unknown as HeadersLike;
  return headers.getSetCookie?.() ?? [];
}

export type ApiOptions = {
  method?: string;
  body?: unknown;
  cookies?: string;
  headers?: Record<string, string>;
};

// Response bodies are arbitrary JSON from the API; callers read fields dynamically.
export type ApiResult = {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  cookies: string;
};

/** Performs an HTTP request against the running integration server. */
export async function api(path: string, options: ApiOptions = {}): Promise<ApiResult> {
  const headers = new Headers(options.headers);
  if (options.cookies) headers.set("Cookie", options.cookies);
  if (options.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (!headers.has("x-forwarded-for")) {
    headers.set("x-forwarded-for", randomClientIp());
  }

  const res = await fetch(readBaseUrl() + path, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { status: res.status, body, cookies: getSetCookie(res).join("; ") };
}

/** Logs in via the real auth endpoint and returns the session cookies. */
export async function login(
  email: string,
  password: string,
): Promise<{ status: number; cookies: string; body: ApiResult["body"] }> {
  const res = await api("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return { status: res.status, cookies: res.cookies, body: res.body };
}
