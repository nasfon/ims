import type { RecentSale } from "@/types/dashboard";

/** Number of recent sales returned by the dashboard. */
export const RECENT_SALES_LIMIT = 8;

export type DashboardDayRange = { start: string; end: string };

/**
 * Returns the real UTC instants ("ISO timestamps") for the start and end of
 * "today" in the business timezone. The product targets Nigeria (en-NG, NGN),
 * so the calendar day defaults to Africa/Lagos (UTC+1, no DST).
 *
 * This keeps "today's sales / revenue / expenses" aligned with the shop's
 * local day rather than the (often UTC) server clock.
 */
export function todayRange(): DashboardDayRange {
  const lagosNow = new Date(Date.now() + 3600_000);
  const startUtc =
    Date.UTC(
      lagosNow.getUTCFullYear(),
      lagosNow.getUTCMonth(),
      lagosNow.getUTCDate(),
    ) - 3600_000;
  return {
    start: new Date(startUtc).toISOString(),
    end: new Date(startUtc + 24 * 3600_000 - 1).toISOString(),
  };
}

type Nested = Record<string, unknown>;

/** Maps a recent-sale DB row to the API shape, coercing numerics. */
export function mapRecentSaleRow(row: Nested): RecentSale {
  const customer = row.customer as Nested | null | undefined;
  const cashier = row.cashier as Nested | null | undefined;
  return {
    id: row.id as string,
    receipt_number: row.receipt_number as string,
    total: Number(row.total),
    status: row.status as RecentSale["status"],
    created_at: row.created_at as string,
    customer: customer
      ? { full_name: (customer.full_name as string | null) ?? null }
      : null,
    cashier: cashier
      ? { full_name: (cashier.full_name as string | null) ?? null }
      : null,
  };
}