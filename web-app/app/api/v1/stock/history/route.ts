import type { NextRequest } from "next/server";

import { apiError, apiSuccess, guardApiUser } from "@/lib/api";
import { ROLES } from "@/lib/roles";
import { STOCK_CHANGE_TYPES, mapStockHistoryRow } from "@/lib/stock";
import type { StockHistoryRow } from "@/types/stock";

const PAGE_LIMIT = 25;
const PAGE_LIMIT_MAX = 100;

export async function GET(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    PAGE_LIMIT_MAX,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? String(PAGE_LIMIT), 10) || PAGE_LIMIT),
  );
  const changeType = searchParams.get("changeType")?.trim();
  const productId = searchParams.get("productId")?.trim();
  const shopId = searchParams.get("shop_id")?.trim();

  let query = session.supabase
    .from("stock_history_with_details")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (changeType && STOCK_CHANGE_TYPES.includes(changeType as (typeof STOCK_CHANGE_TYPES)[number])) {
    query = query.eq("change_type", changeType);
  }
  if (productId) {
    query = query.eq("product_id", productId);
  }
  if (shopId && session.user.role_slug === ROLES.SUPER_ADMIN) {
    query = query.eq("shop_id", shopId);
  }

  const { data, count, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load stock history.", 500);
  }

  return apiSuccess(
    {
      items: (data ?? []).map((row) => mapStockHistoryRow(row as StockHistoryRow)),
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    },
    "Stock history loaded.",
  );
}