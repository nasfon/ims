import { describe, it, expect } from "vitest";

import { formatDate, formatDateTime, formatNaira, formatReceiptNumber } from "@/lib/utils";

describe("formatNaira (currency)", () => {
  it("formats a whole Naira amount with the ₦ symbol and 2 decimals", () => {
    expect(formatNaira(1000)).toBe("₦1,000.00");
  });

  it("formats kobo fractions", () => {
    expect(formatNaira(49.99)).toBe("₦49.99");
  });

  it("adds thousands separators", () => {
    expect(formatNaira(1234567.5)).toBe("₦1,234,567.50");
  });

  it("treats non-finite input as zero", () => {
    expect(formatNaira(NaN)).toBe("₦0.00");
    expect(formatNaira(Infinity)).toBe("₦0.00");
    expect(formatNaira(undefined as unknown as number)).toBe("₦0.00");
  });
});

describe("formatReceiptNumber (receipt numbers)", () => {
  it("zero-pads a single-digit counter to 6 digits", () => {
    expect(formatReceiptNumber(1)).toBe("000001");
  });

  it("zero-pads a mid-range counter", () => {
    expect(formatReceiptNumber(1234)).toBe("001234");
  });

  it("leaves a 6-digit number unchanged", () => {
    expect(formatReceiptNumber(987654)).toBe("987654");
  });

  it("formats the first receipt as 000000 when counter is 0", () => {
    expect(formatReceiptNumber(0)).toBe("000000");
  });

  it("truncates fractional counters", () => {
    expect(formatReceiptNumber(42.9)).toBe("000042");
  });

  it("clamps negatives to zero", () => {
    expect(formatReceiptNumber(-5)).toBe("000000");
  });

  it("handles non-finite input as zero", () => {
    expect(formatReceiptNumber(NaN)).toBe("000000");
  });
});

describe("formatDate (dates)", () => {
  it("formats an ISO timestamp as a short date", () => {
    expect(formatDate("2026-08-07T13:45:00Z")).toBe("07 Aug 2026");
  });

  it("accepts a Date instance", () => {
    expect(formatDate(new Date("2026-01-01T00:00:00Z"))).toBe("01 Jan 2026");
  });

  it("returns 'Invalid Date' for an unparseable value", () => {
    expect(formatDate("not-a-date")).toBe("Invalid Date");
  });
});

describe("formatDateTime (dates + time)", () => {
  it("formats an ISO timestamp as a short date and time", () => {
    expect(formatDateTime("2026-08-07T13:45:00Z")).toBe("07 Aug 2026, 13:45");
  });

  it("returns 'Invalid Date' for an unparseable value", () => {
    expect(formatDateTime("garbage")).toBe("Invalid Date");
  });

  it("renders distinct values for distinct instants", () => {
    expect(formatDateTime("2026-08-07T00:00:00Z")).not.toBe(
      formatDateTime("2026-08-08T00:00:00Z"),
    );
  });
});
