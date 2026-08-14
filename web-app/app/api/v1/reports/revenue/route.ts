import type { NextRequest } from "next/server";

import { apiError, apiSuccess, guardApiRole, guardApiUser } from "@/lib/api";
import {
  groupRevenueByDay,
  parseReportParams,
  REPORT_ROW_CAP,
} from "@/lib/reports";
import { ROLES } from "@/lib/roles";
import type { RevenueReport, SalesSummary } from "@/types/reports";

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
    .select("created_at, subtotal, discount, total, amount_paid")
    .neq("status", "reversed")
    .order("created_at", { ascending: true })
    .limit(REPORT_ROW_CAP + 1);

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (shop_id && session.user.role_slug === ROLES.SUPER_ADMIN) {
    query = query.eq("shop_id", shop_id);
  }

  const { data, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load the revenue report.", 500);
  }

  const rows = (data ?? []).map((row) => ({
    created_at: row.created_at as string,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    amount_paid: Number(row.amount_paid),
  }));
  const truncated = rows.length > REPORT_ROW_CAP;
  const used = truncated ? rows.slice(0, REPORT_ROW_CAP) : rows;

  const items = groupRevenueByDay(used);
  const summary: SalesSummary = used.reduce(
    (acc, row) => ({
      total_sales: acc.total_sales + 1,
      subtotal: acc.subtotal + row.subtotal,
      discount: acc.discount + row.discount,
      revenue: acc.revenue + row.total,
      amount_paid: acc.amount_paid + row.amount_paid,
      remaining_credit: acc.remaining_credit + 0,
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

  const report: RevenueReport = { summary, items, truncated };
  return apiSuccess(report, "Revenue report loaded.");
}