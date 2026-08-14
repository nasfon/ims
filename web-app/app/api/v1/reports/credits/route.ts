import type { NextRequest } from "next/server";

import { apiError, apiSuccess, guardApiRole, guardApiUser } from "@/lib/api";
import {
  mapCreditReportCustomer,
  parseReportParams,
} from "@/lib/reports";
import { ROLES } from "@/lib/roles";
import type { CreditReport } from "@/types/reports";

export async function GET(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const parsed = parseReportParams(request.nextUrl.searchParams);
  if (parsed.error) return parsed.error;
  const { from, to, shop_id } = parsed.query!;

  // Outstanding balances are an all-time snapshot; the date range scopes the
  // "payments received" figure below.
  let customersQuery = session.supabase
    .from("customers")
    .select("id, full_name, phone, total_credit")
    .is("deleted_at", null)
    .gt("total_credit", 0)
    .order("total_credit", { ascending: false });

  if (shop_id && session.user.role_slug === ROLES.SUPER_ADMIN) {
    customersQuery = customersQuery.eq("shop_id", shop_id);
  }

  const [customersResult, paymentsResult] = await Promise.all([
    customersQuery,
    (() => {
      let q = session.supabase
        .from("credit_payments")
        .select("amount");
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", to);
      return q;
    })(),
  ]);

  if (customersResult.error || paymentsResult.error) {
    return apiError("Unable to load the credit report.", 500);
  }

  const items = (customersResult.data ?? []).map((row) =>
    mapCreditReportCustomer(row as Record<string, unknown>),
  );
  const totalOutstanding = items.reduce(
    (sum, customer) => sum + customer.total_credit,
    0,
  );
  const paymentRows = paymentsResult.data ?? [];
  const paymentsReceived = paymentRows.reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );

  const report: CreditReport = {
    summary: {
      total_outstanding: totalOutstanding,
      customers_with_credit: items.length,
      payments_received: paymentsReceived,
      payments_count: paymentRows.length,
    },
    items,
  };
  return apiSuccess(report, "Credit report loaded.");
}