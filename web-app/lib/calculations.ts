/**
 * Pure business calculations for sales, stock, credit, and revenue.
 *
 * These are the single source of truth for the client-side sale preview and are
 * unit tested in `lib/calculations.test.ts`. The authoritative values for a
 * persisted sale are computed by the `create_sale` / `correct_sale` /
 * `reverse_sale` RPCs; these helpers mirror that arithmetic so the UI preview
 * and the stored totals never diverge.
 */

/** Naira is handled to 2 decimal places throughout the app (PRD §2.5). */
export const MONEY_DECIMALS = 2;

/** Rounds a value to Naira precision, treating non-finite input as 0. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** MONEY_DECIMALS;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export type CalcLine = {
  unit_price: number;
  quantity: number;
};

/** Line total = unit_price × quantity, rounded to Naira precision. */
export function calcLineTotal(line: CalcLine): number {
  const unitPrice = Number.isFinite(line.unit_price) ? line.unit_price : 0;
  const quantity = Number.isFinite(line.quantity) ? line.quantity : 0;
  return roundMoney(unitPrice * quantity);
}

/** Sum of every line total, rounded to Naira precision. */
export function calcSubtotal(lines: CalcLine[]): number {
  const sum = (lines ?? []).reduce((acc, line) => acc + calcLineTotal(line), 0);
  return roundMoney(sum);
}

/**
 * Discount applied to a subtotal. Always non-negative and never exceeds the
 * subtotal (mirrors the `invalid_discount` guard in `create_sale`).
 */
export function calcDiscount(subtotal: number, discount: number): number {
  const raw = Number.isFinite(discount) ? discount : 0;
  if (raw <= 0) return 0;
  const capped = Math.min(raw, Math.max(0, subtotal));
  return roundMoney(capped);
}

/** Sale total = subtotal − discount, never negative. */
export function calcTotal(subtotal: number, discount: number): number {
  return roundMoney(Math.max(0, subtotal - calcDiscount(subtotal, discount)));
}

/** Amount paid, clamped to non-negative and rounded. */
export function calcAmountPaid(amountPaid: number): number {
  const raw = Number.isFinite(amountPaid) ? amountPaid : 0;
  return roundMoney(Math.max(0, raw));
}

/** Outstanding balance after payment = max(0, total − amount paid). */
export function calcRemainingCredit(total: number, amountPaid: number): number {
  return roundMoney(Math.max(0, total - calcAmountPaid(amountPaid)));
}

/* ----------------------------- Stock -------------------------------------- */

/** Quantity remaining after selling `sold` units (may be 0 or negative if the
 * caller did not validate stock; the DB prevents negative committed stock). */
export function calcStockAfterSale(current: number, sold: number): number {
  const c = Number.isFinite(current) ? current : 0;
  const s = Number.isFinite(sold) ? sold : 0;
  return c - s;
}

/** A product is low on stock when its quantity is at or below its reorder
 * threshold (inclusive, matching `GET /stock/low`). */
export function isLowStock(quantity: number, minimumStock: number): boolean {
  const q = Number.isFinite(quantity) ? quantity : 0;
  const m = Number.isFinite(minimumStock) ? minimumStock : 0;
  return q <= m;
}

/** Inventory value = on-hand quantity × selling price. */
export function calcStockValue(quantity: number, unitPrice: number): number {
  const q = Number.isFinite(quantity) ? quantity : 0;
  const p = Number.isFinite(unitPrice) ? unitPrice : 0;
  return roundMoney(q * p);
}

/* ----------------------------- Credit ------------------------------------- */

/** True when a payment would push the customer's outstanding balance negative. */
export function paymentExceedsBalance(balance: number, payment: number): boolean {
  const b = Number.isFinite(balance) ? balance : 0;
  const p = Number.isFinite(payment) ? payment : 0;
  return p > b;
}

/** Outstanding balance after applying a payment (floored at 0). */
export function calcRemainingBalance(balance: number, payment: number): number {
  const b = Number.isFinite(balance) ? balance : 0;
  const p = Number.isFinite(payment) ? payment : 0;
  return roundMoney(Math.max(0, b - p));
}

/** A balance is settled once it rounds to zero or below. */
export function isFullyPaid(balance: number): boolean {
  return roundMoney(balance) <= 0;
}
