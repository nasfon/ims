import { describe, it, expect } from "vitest";

import {
  dayKeyInBusinessTz,
  groupRevenueByDay,
  mapInventoryReportRow,
  parseReportParams,
} from "@/lib/reports";

describe("dayKeyInBusinessTz", () => {
  it("shifts UTC to Africa/Lagos (UTC+1, no DST) for day bucketing", () => {
    expect(dayKeyInBusinessTz("2026-08-07T23:30:00.000Z")).toBe("2026-08-08");
    expect(dayKeyInBusinessTz("2026-08-07T10:00:00.000Z")).toBe("2026-08-07");
  });

  it("handles midnight UTC as the previous business day", () => {
    expect(dayKeyInBusinessTz("2026-08-08T00:00:00.000Z")).toBe("2026-08-08");
    expect(dayKeyInBusinessTz("2026-08-08T00:59:59.999Z")).toBe("2026-08-08");
  });
});

describe("groupRevenueByDay", () => {
  const rows = [
    { created_at: "2026-08-07T09:00:00.000Z", total: 1000, subtotal: 1200, discount: 200, amount_paid: 600 },
    { created_at: "2026-08-07T15:00:00.000Z", total: 500, subtotal: 500, discount: 0, amount_paid: 500 },
    { created_at: "2026-08-08T11:00:00.000Z", total: 250, subtotal: 250, discount: 0, amount_paid: 100 },
  ];

  it("buckets sales by business-day and sums the money columns", () => {
    const result = groupRevenueByDay(rows);
    expect(result).toHaveLength(2);

    const day1 = result[0];
    expect(day1.date).toBe("2026-08-07");
    expect(day1.sales).toBe(2);
    expect(day1.subtotal).toBe(1700);
    expect(day1.discount).toBe(200);
    expect(day1.revenue).toBe(1500);
    expect(day1.amount_paid).toBe(1100);

    const day2 = result[1];
    expect(day2.date).toBe("2026-08-08");
    expect(day2.sales).toBe(1);
    expect(day2.revenue).toBe(250);
  });

  it("returns an empty array for no rows", () => {
    expect(groupRevenueByDay([])).toEqual([]);
  });

  it("sorts days chronologically", () => {
    const unsorted = [
      { created_at: "2026-08-09T00:00:00.000Z", total: 1, subtotal: 1, discount: 0, amount_paid: 1 },
      { created_at: "2026-08-07T00:00:00.000Z", total: 1, subtotal: 1, discount: 0, amount_paid: 1 },
    ];
    const result = groupRevenueByDay(unsorted);
    expect(result.map((d) => d.date)).toEqual(["2026-08-07", "2026-08-09"]);
  });
});

describe("mapInventoryReportRow", () => {
  it("computes stock value as quantity × selling price", () => {
    const row = mapInventoryReportRow({
      id: "p1",
      name: "Rice 50kg",
      sku: "RICE-50",
      quantity: 12,
      selling_price: 25000,
      minimum_stock: 5,
      is_active: true,
    });
    expect(row.stock_value).toBe(300000);
    expect(row.quantity).toBe(12);
    expect(row.is_active).toBe(true);
  });

  it("coerces numeric strings from PostgREST", () => {
    const row = mapInventoryReportRow({
      id: "p2",
      name: "Sugar",
      sku: "SUG-1",
      quantity: "3" as unknown as number,
      selling_price: "1500" as unknown as number,
      minimum_stock: "2" as unknown as number,
      is_active: true,
    });
    expect(row.stock_value).toBe(4500);
  });
});

describe("parseReportParams", () => {
  it("accepts date-only ranges and scopes by shop", () => {
    const sp = new URLSearchParams("startDate=2026-08-01&endDate=2026-08-31&shop_id=abc");
    const { query, error } = parseReportParams(sp);
    expect(error).toBeNull();
    expect(query).toEqual({
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-08-31T23:59:59.999Z",
      shop_id: "abc",
    });
  });

  it("rejects an end date before the start date", () => {
    const sp = new URLSearchParams("startDate=2026-08-31&endDate=2026-08-01");
    const { query, error } = parseReportParams(sp);
    expect(query).toBeNull();
    expect(error?.status).toBe(422);
  });

  it("rejects an invalid date", () => {
    const sp = new URLSearchParams("startDate=not-a-date");
    const { error } = parseReportParams(sp);
    expect(error?.status).toBe(422);
  });
});
