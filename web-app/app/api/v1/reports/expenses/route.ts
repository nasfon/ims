import type { NextRequest } from "next/server";

import { apiError, apiSuccess, guardApiRole, guardApiUser } from "@/lib/api";
import {
  mapExpenseReportRow,
  parseReportParams,
  REPORT_ROW_CAP,
} from "@/lib/reports";
import { ROLES } from "@/lib/roles";
import type { ExpensesReport } from "@/types/reports";

export async function GET(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const parsed = parseReportParams(request.nextUrl.searchParams);
  if (parsed.error) return parsed.error;
  const { from, to, shop_id } = parsed.query!;

  let query = session.supabase
    .from("expenses")
    .select("id, description, amount, expense_date, recorder:users(full_name)")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(REPORT_ROW_CAP + 1);

  if (from) query = query.gte("expense_date", from);
  if (to) query = query.lte("expense_date", to);
  if (shop_id && session.user.role_slug === ROLES.SUPER_ADMIN) {
    query = query.eq("shop_id", shop_id);
  }

  const { data, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load the expenses report.", 500);
  }

  const all = (data ?? []).map((row) =>
    mapExpenseReportRow(row as Record<string, unknown>),
  );
  const truncated = all.length > REPORT_ROW_CAP;
  const items = truncated ? all.slice(0, REPORT_ROW_CAP) : all;

  const summary = items.reduce(
    (acc, expense) => ({
      count: acc.count + 1,
      total: acc.total + expense.amount,
    }),
    { count: 0, total: 0 },
  );

  const report: ExpensesReport = { summary, items, truncated };
  return apiSuccess(report, "Expenses report loaded.");
}