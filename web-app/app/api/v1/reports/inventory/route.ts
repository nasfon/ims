import type { NextRequest } from "next/server";

import { apiError, apiSuccess, guardApiRole, guardApiUser } from "@/lib/api";
import {
  mapInventoryReportRow,
  parseReportParams,
  REPORT_ROW_CAP,
} from "@/lib/reports";
import { ROLES } from "@/lib/roles";

export async function GET(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  // A current snapshot; the date range does not apply to inventory.
  const parsed = parseReportParams(request.nextUrl.searchParams);
  if (parsed.error) return parsed.error;
  const { shop_id } = parsed.query!;

  let query = session.supabase
    .from("products")
    .select(
      "id, name, sku, quantity, selling_price, minimum_stock, is_active",
    )
    .is("deleted_at", null)
    .order("name")
    .limit(REPORT_ROW_CAP + 1);

  if (shop_id && session.user.role_slug === ROLES.SUPER_ADMIN) {
    query = query.eq("shop_id", shop_id);
  }

  const { data, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load the inventory report.", 500);
  }

  const rows = (data ?? []).map((row) =>
    mapInventoryReportRow(row as Record<string, unknown>),
  );
  const truncated = rows.length > REPORT_ROW_CAP;
  const items = truncated ? rows.slice(0, REPORT_ROW_CAP) : rows;

  const summary = items.reduce(
    (acc, product) => ({
      total_products: acc.total_products + 1,
      total_units: acc.total_units + product.quantity,
      low_stock:
        acc.low_stock +
        (product.quantity <= product.minimum_stock ? 1 : 0),
      stock_value: acc.stock_value + product.stock_value,
    }),
    { total_products: 0, total_units: 0, low_stock: 0, stock_value: 0 },
  );

  return apiSuccess({ summary, items, truncated }, "Inventory report loaded.");
}