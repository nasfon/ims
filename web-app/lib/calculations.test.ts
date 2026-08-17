import { describe, it, expect } from "vitest";

import {
  calcAmountPaid,
  calcDiscount,
  calcLineTotal,
  calcRemainingBalance,
  calcRemainingCredit,
  calcStockAfterSale,
  calcStockValue,
  calcSubtotal,
  calcTotal,
  isFullyPaid,
  isLowStock,
  paymentExceedsBalance,
  roundMoney,
} from "@/lib/calculations";

describe("roundMoney", () => {
  it("rounds to 2 decimal places", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(1.004)).toBe(1.0);
    expect(roundMoney(1234.5)).toBe(1234.5);
  });

  it("treats non-finite input as 0", () => {
    expect(roundMoney(NaN)).toBe(0);
    expect(roundMoney(Infinity)).toBe(0);
    expect(roundMoney(undefined as unknown as number)).toBe(0);
  });
});

describe("calcLineTotal", () => {
  it("multiplies unit price by quantity", () => {
    expect(calcLineTotal({ unit_price: 100, quantity: 3 })).toBe(300);
    expect(calcLineTotal({ unit_price: 49.99, quantity: 2 })).toBe(99.98);
  });

  it("handles fractional kobo totals without float drift", () => {
    expect(calcLineTotal({ unit_price: 0.1, quantity: 3 })).toBe(0.3);
    expect(calcLineTotal({ unit_price: 19.99, quantity: 1 })).toBe(19.99);
  });

  it("treats non-finite inputs as zero", () => {
    expect(calcLineTotal({ unit_price: NaN, quantity: 5 })).toBe(0);
    expect(calcLineTotal({ unit_price: 10, quantity: NaN })).toBe(0);
  });
});

describe("calcSubtotal", () => {
  it("sums line totals", () => {
    const lines = [
      { unit_price: 100, quantity: 2 },
      { unit_price: 50, quantity: 1 },
      { unit_price: 25, quantity: 4 },
    ];
    expect(calcSubtotal(lines)).toBe(350);
  });

  it("returns 0 for an empty cart", () => {
    expect(calcSubtotal([])).toBe(0);
  });

  it("is resilient to a null/undefined list", () => {
    expect(calcSubtotal(null as unknown as never[])).toBe(0);
  });

  it("does not accumulate floating-point error", () => {
    const lines = Array.from({ length: 10 }, () => ({ unit_price: 0.1, quantity: 1 }));
    expect(calcSubtotal(lines)).toBe(1);
  });
});

describe("calcDiscount", () => {
  it("caps a discount at the subtotal", () => {
    expect(calcDiscount(500, 600)).toBe(500);
  });

  it("returns 0 for negative or zero discount", () => {
    expect(calcDiscount(500, -50)).toBe(0);
    expect(calcDiscount(500, 0)).toBe(0);
  });

  it("accepts a partial discount", () => {
    expect(calcDiscount(500, 120)).toBe(120);
  });

  it("never yields a negative total via calcTotal", () => {
    expect(calcTotal(500, 600)).toBe(0);
  });
});

describe("calcTotal", () => {
  it("subtracts discount from subtotal", () => {
    expect(calcTotal(1000, 150)).toBe(850);
  });

  it("is never negative", () => {
    expect(calcTotal(100, 200)).toBe(0);
  });

  it("handles a fully discounted sale", () => {
    expect(calcTotal(750, 750)).toBe(0);
  });
});

describe("calcAmountPaid / calcRemainingCredit", () => {
  it("clamps amount paid to non-negative", () => {
    expect(calcAmountPaid(-20)).toBe(0);
    expect(calcAmountPaid(300)).toBe(300);
  });

  it("remaining credit is total minus amount paid", () => {
    expect(calcRemainingCredit(1000, 400)).toBe(600);
  });

  it("remaining credit is 0 when fully paid", () => {
    expect(calcRemainingCredit(1000, 1000)).toBe(0);
    expect(calcRemainingCredit(1000, 1200)).toBe(0);
  });

  it("a paid-in-full sale leaves no credit even with overpayment", () => {
    expect(calcRemainingCredit(500, 500)).toBe(0);
  });

  it("supports a pure walk-in credit sale (amount paid 0)", () => {
    expect(calcRemainingCredit(250, 0)).toBe(250);
  });
});

describe("stock calculations", () => {
  it("calcStockAfterSale deducts sold units", () => {
    expect(calcStockAfterSale(50, 12)).toBe(38);
  });

  it("isLowStock flags at or below the threshold (inclusive)", () => {
    expect(isLowStock(5, 5)).toBe(true);
    expect(isLowStock(4, 5)).toBe(true);
    expect(isLowStock(6, 5)).toBe(false);
  });

  it("calcStockValue multiplies quantity by price", () => {
    expect(calcStockValue(10, 250)).toBe(2500);
    expect(calcStockValue(3, 19.99)).toBe(59.97);
  });

  it("treats non-finite stock inputs as zero value", () => {
    expect(calcStockValue(NaN, 100)).toBe(0);
    expect(calcStockValue(5, NaN)).toBe(0);
  });
});

describe("credit calculations", () => {
  it("paymentExceedsBalance detects overpayment", () => {
    expect(paymentExceedsBalance(500, 500)).toBe(false);
    expect(paymentExceedsBalance(500, 501)).toBe(true);
    expect(paymentExceedsBalance(0, 1)).toBe(true);
  });

  it("calcRemainingBalance reduces but never goes negative", () => {
    expect(calcRemainingBalance(1000, 400)).toBe(600);
    expect(calcRemainingBalance(1000, 1200)).toBe(0);
  });

  it("isFullyPaid is true only at/under zero balance", () => {
    expect(isFullyPaid(0)).toBe(true);
    expect(isFullyPaid(-0.01)).toBe(true);
    expect(isFullyPaid(0.01)).toBe(false);
  });
});
