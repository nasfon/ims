import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

const alias = {
  "@": resolve(root),
};

const sharedExclude = [
  "node_modules",
  ".next",
  ".vercel",
  "**/node_modules/**",
  "**/.next/**",
  // Integration tests run against a live Supabase + Next server via a
  // separate config (`npm run test:integration`), not the default suite.
  "test/integration/**",
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias,
  },
  test: {
    globals: true,
    setupFiles: ["./test/setup.ts"],
    // Dummy public Supabase vars so server modules that read them at import
    // time (e.g. lib/supabase/server via lib/api) can be imported in tests.
    // Never real secrets — only the public anon key shape is required.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      // Pin the timezone so locale date formatting is deterministic in tests.
      TZ: "UTC",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./test/coverage",
      include: ["lib/**", "server/**"],
      exclude: ["lib/supabase/**", "**/*.d.ts", "**/*.config.*"],
    },
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: sharedExclude,
          setupFiles: ["./test/setup.ts"],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "component",
          environment: "jsdom",
          include: ["**/*.test.tsx"],
          exclude: sharedExclude,
          setupFiles: ["./test/setup.ts"],
        },
      },
    ],
  },
});
