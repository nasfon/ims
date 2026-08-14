import type { NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import type {
  CreditReportCustomer,
  ExpenseReportRow,
  InventoryReportRow,
  ReportQuery,
  RevenueDayRow,
  SalesReportRow,
} from "@/types/reports";

/** Hard cap on the number of report rows returned (defensive). */
export const REPORT_ROW_CAP = 1000;

type ParsedReportQuery =
  | { query: ReportQuery; error: null }
  | { query: null; error: NextResponse };

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function dayStart(raw: string): string | null {
  if (DATE_ONLY_RE.test(raw)) return `${raw}T00:00:00.000Z`;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function dayEnd(raw: string): string | null {
  if (DATE_ONLY_RE.test(raw)) return `${raw}T23:59:59.999Z`;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

/**
 * Parses the shared `startDate`/`endDate`/`shop_id` params for report routes.
 * Accepts date-only ("2026-08-07") or full ISO timestamps. `endDate` is
 * inclusive (end of its day). Returns a 422 response when invalid.
 */
export function parseReportParams(
  searchParams: URLSearchParams,
): ParsedReportQuery {
  const fromRaw = searchParams.get("startDate") ?? searchParams.get("date_from");
  const toRaw = searchParams.get("endDate") ?? searchParams.get("date_to");

  let from: string | null = null;
  let to: string | null = null;

  if (fromRaw) {
    from = dayStart(fromRaw);
    if (!from) return { query: null, error: apiError("startDate is invalid.", 422) };
  }
  if (toRaw) {
    to = dayEnd(toRaw);
    if (!to) return { query: null, error: apiError("endDate is invalid.", 422) };
  }
  if (from && to && from > to) {
    return { query: null, error: apiError("startDate must be before endDate.", 422) };
  }

  const shopId = searchParams.get("shop_id")?.trim() || null;

  return { query: { from, to, shop_id: shopId }, error: null };
}

/**
 * Returns "YYYY-MM-DD" for a timestamp in the business timezone
 * (Africa/Lagos, UTC+1, no DST) so report days align with the shops' calendar.
 */
export function dayKeyInBusinessTz(iso: string): string {
  return new Date(new Date(iso).getTime() + 3600_000).toISOString().slice(0, 10);
}

type Nested = Record<string, unknown>;

export function mapSalesReportRow(row: Nested): SalesReportRow {
  const customer = row.customer as Nested | null | undefined;
  const cashier = row.cashier as Nested | null | undefined;
  return {
    id: row.id as string,
    receipt_number: row.receipt_number as string,
    created_at: row.created_at as string,
    customer_name: (customer?.full_name as string | null) ?? null,
    cashier_name: (cashier?.full_name as string | null) ?? null,
    payment_method: row.payment_method as string,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    amount_paid: Number(row.amount_paid),
    remaining_credit: Number(row.remaining_credit),
    status: row.status as SalesReportRow["status"],
  };
}

export function mapExpenseReportRow(row: Nested): ExpenseReportRow {
  const recorder = row.recorder as Nested | null | undefined;
  return {
    id: row.id as string,
    description: row.description as string,
    amount: Number(row.amount),
    expense_date: row.expense_date as string,
    recorded_by_name: (recorder?.full_name as string | null) ?? null,
  };
}

export function mapCreditReportCustomer(row: Nested): CreditReportCustomer {
  return {
    id: row.id as string,
    full_name: row.full_name as string,
    phone: row.phone as string,
    total_credit: Number(row.total_credit),
  };
}

export function mapInventoryReportRow(row: Nested): InventoryReportRow {
  const quantity = Number(row.quantity);
  const sellingPrice = Number(row.selling_price);
  return {
    id: row.id as string,
    name: row.name as string,
    sku: row.sku as string,
    quantity,
    selling_price: sellingPrice,
    stock_value: quantity * sellingPrice,
    minimum_stock: Number(row.minimum_stock),
    is_active: row.is_active as boolean,
  };
}

/** Groups raw sale totals into a per-day revenue series. */
export function groupRevenueByDay(
  rows: { created_at: string; total: number; subtotal: number; discount: number; amount_paid: number }[],
): RevenueDayRow[] {
  const byDay = new Map<string, RevenueDayRow>();
  for (const row of rows) {
    const date = dayKeyInBusinessTz(row.created_at);
    let day = byDay.get(date);
    if (!day) {
      day = {
        date,
        sales: 0,
        subtotal: 0,
        discount: 0,
        revenue: 0,
        amount_paid: 0,
      };
      byDay.set(date, day);
    }
    day.sales += 1;
    day.subtotal += Number(row.subtotal);
    day.discount += Number(row.discount);
    day.revenue += Number(row.total);
    day.amount_paid += Number(row.amount_paid);
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}