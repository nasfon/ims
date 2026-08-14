import type { NextRequest } from "next/server";

import { apiError, apiSuccess, guardApiRole, guardApiUser } from "@/lib/api";
import {
  mapSalesReportRow,
  parseReportParams,
  REPORT_ROW_CAP,
} from "@/lib/reports";
import { ROLES } from "@/lib/roles";
import type { SalesReport, SalesSummary } from "@/types/reports";

export async function GET(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const parsed = parseReportParams(request.nextUrl.searchParams);
  if (parsed.error) return parsed.error;
  const { from, to, shop_id } = parsed.query!;

  let query = session.supabase
    .from("sales")
    .select(
      "id, receipt_number, created_at, payment_method, subtotal, discount, total, amount_paid, remaining_credit, status, customer:customers(full_name), cashier:users(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(REPORT_ROW_CAP + 1);

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (shop_id && session.user.role_slug === ROLES.SUPER_ADMIN) {
    query = query.eq("shop_id", shop_id);
  }

  const { data, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load the sales report.", 500);
  }

  const all = (data ?? []).map((row) => mapSalesReportRow(row as Record<string, unknown>));
  const truncated = all.length > REPORT_ROW_CAP;
  const items = truncated ? all.slice(0, REPORT_ROW_CAP) : all;

  // Reversed sales represent voided transactions and never contribute to money.
  const valid = items.filter((sale) => sale.status !== "reversed");
  const summary: SalesSummary = valid.reduce(
    (acc, sale) => ({
      total_sales: acc.total_sales + 1,
      subtotal: acc.subtotal + sale.subtotal,
      discount: acc.discount + sale.discount,
      revenue: acc.revenue + sale.total,
      amount_paid: acc.amount_paid + sale.amount_paid,
      remaining_credit: acc.remaining_credit + sale.remaining_credit,
    }),
    {
      total_sales: 0,
      subtotal: 0,
      discount: 0,
      revenue: 0,
      amount_paid: 0,
      remaining_credit: 0,
    },
  );

  const report: SalesReport = { summary, items, truncated };
  return apiSuccess(report, "Sales report loaded.");
}