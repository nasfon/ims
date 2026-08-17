import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads Supabase credentials from `.env.local` (and `.env`) into process.env so
 * the test process can build Supabase clients. The Next.js server started by
 * `globalSetup` reads `.env.local` itself; this is only for the test clients.
 *
 * No secrets are logged.
 */
export function loadEnv(): void {
  const cwd = process.cwd();
  for (const file of [".env", ".env.local"]) {
    const path = resolve(cwd, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2];
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}
