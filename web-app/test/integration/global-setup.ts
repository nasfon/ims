import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream } from "node:fs";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FALLBACK_PORT = 3939;
const URL_FILE = resolve(process.cwd(), "test/.integration-server-url");
const LOG_FILE = resolve(process.cwd(), "test/integration-next.log");

/** Candidates to reuse before spawning a fresh server. */
function candidateUrls(): string[] {
  const explicit = process.env.INTEGRATION_BASE_URL?.trim();
  const candidates = explicit ? [explicit] : [];
  candidates.push(`http://127.0.0.1:${FALLBACK_PORT}`, "http://127.0.0.1:3000");
  return candidates;
}

async function isServing(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/v1/auth/session`, { signal: AbortSignal.timeout(2000) });
    return typeof res.status === "number";
  } catch {
    return false;
  }
}

async function findExistingServer(): Promise<string | null> {
  for (const url of candidateUrls()) {
    if (await isServing(url)) return url;
  }
  return null;
}

/**
 * Best-effort pre-compilation of routes the integration tests exercise.
 * Next's dev server compiles each route on first request; doing that once
 * here (during setup) keeps individual tests from blowing their timeout on a
 * cold compile — the receipt PDF route in particular pulls in jspdf.
 */
async function warmRoutes(baseUrl: string): Promise<void> {
  const targets = [
    `${baseUrl}/api/v1/auth/session`,
    `${baseUrl}/api/v1/auth/logout`,
    `${baseUrl}/api/v1/sales`,
    `${baseUrl}/api/v1/sales/00000000-0000-0000-0000-000000000000/receipt/pdf`,
    `${baseUrl}/api/v1/settings/business`,
    `${baseUrl}/api/v1/products`,
  ];
  await Promise.allSettled(
    targets.map((url) =>
      fetch(url, {
        method: "GET",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(60_000),
      }).catch(() => {}),
    ),
  );
}

async function waitForServer(baseUrl: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isServing(baseUrl)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

/**
 * Boots a Next.js dev server for the integration run, reusing one if it is
 * already listening (e.g. `next dev` running in the dev environment). The server
 * reads `.env.local` itself, so the app sees the same Supabase config as tests.
 */
export async function setup(): Promise<() => Promise<void>> {
  const existing = await findExistingServer();
  if (existing) {
    writeFileSync(URL_FILE, existing);
    await warmRoutes(existing);
    // Nothing to tear down — we did not start it.
    return async function teardown(): Promise<void> {
      if (existsSync(URL_FILE)) unlinkSync(URL_FILE);
    };
  }

  const baseUrl = `http://127.0.0.1:${FALLBACK_PORT}`;
  const log = createWriteStream(LOG_FILE, { flags: "a" });

  const child: ChildProcess = spawn(
    "npx",
    ["next", "dev", "-p", String(FALLBACK_PORT)],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);

  const ready = await waitForServer(baseUrl, 180_000);
  if (!ready) {
    child.kill("SIGTERM");
    throw new Error("Next.js dev server did not become ready in time (see test/integration-next.log).");
  }

  writeFileSync(URL_FILE, baseUrl);
  await warmRoutes(baseUrl);

  return async function teardown(): Promise<void> {
    child.kill("SIGTERM");
    log.end();
    if (existsSync(URL_FILE)) unlinkSync(URL_FILE);
  };
}
