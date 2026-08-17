import { describe, it, expect } from "vitest";
import { formatNaira } from "@/lib/utils";

describe("test framework setup", () => {
  it("resolves the @ alias and runs assertions", () => {
    expect(formatNaira(0)).toBe("₦0.00");
    expect(formatNaira(1234.5)).toBe("₦1,234.50");
  });

  it("supports basic matchers", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
  });
});
