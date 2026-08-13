import type { NextRequest } from "next/server";

import { apiError, apiSuccess, guardApiUser } from "@/lib/api";
import { mapProductRow, type ProductRow } from "@/lib/products";

const PAGE_LIMIT = 25;
const PAGE_LIMIT_MAX = 100;
const SEARCH_MAX = 100;

export async function GET(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    PAGE_LIMIT_MAX,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? String(PAGE_LIMIT), 10) || PAGE_LIMIT),
  );
  const search = (searchParams.get("search") ?? "").trim().slice(0, SEARCH_MAX);
  const includeInactive = searchParams.get("includeInactive") === "true";

  let query = session.supabase
    .from("products")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("name")
    .range((page - 1) * limit, page * limit - 1);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  query = query.or("quantity.lte.minimum_stock");

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  const { data, count, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load low stock products.", 500);
  }

  return apiSuccess(
    {
      items: (data ?? []).map((row) => mapProductRow(row as ProductRow)),
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    },
    "Low stock products loaded.",
  );
}