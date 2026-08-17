import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const alias = { "@": resolve(root) };

/**
 * Integration test project.
 *
 * Runs against the Supabase instance configured via env (the dev project by
 * default; a local `supabase start` stack in CI — same code, different env).
 * A live Next.js dev server is booted in `globalSetup` so API route handlers
 * are exercised over real HTTP with real Supabase Auth sessions.
 *
 * Run with: `npm run test:integration`.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    name: "integration",
    environment: "node",
    globals: true,
    include: ["test/integration/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
    globalSetup: ["./test/integration/global-setup.ts"],
    env: { TZ: "UTC" },
    // One server for the whole project; keep tests serial to avoid shared-state races.
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 240000,
    pool: "forks",
  },
});
