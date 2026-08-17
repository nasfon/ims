import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// `server-only` is a Next.js build-time guard that throws when imported outside
// a React Server Component. It has no runtime meaning in tests, so stub it out
// to allow unit-testing server modules that transitively import it.
vi.mock("server-only", () => ({}));
