import type { NextRequest } from "next/server";

import { apiError, apiSuccess, guardApiRole, guardApiUser } from "@/lib/api";
import {
  CUSTOMER_SORT_FIELDS,
  DEFAULT_CUSTOMER_SORT,
  mapCustomerRow,
  type CustomerRow,
} from "@/lib/customers";
import { ROLES } from "@/lib/roles";

const PAGE_LIMIT = 25;
const PAGE_LIMIT_MAX = 100;
const SEARCH_MAX = 100;

/**
 * Outstanding Credit (credit book): customers with total_credit > 0.
 * RLS scopes rows to the caller's shop (or all shops for Super Admin).
 */
export async function GET(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    PAGE_LIMIT_MAX,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? String(PAGE_LIMIT), 10) || PAGE_LIMIT),
  );
  const search = (searchParams.get("search") ?? "").trim().slice(0, SEARCH_MAX);

  const sortRaw = searchParams.get("sort") ?? DEFAULT_CUSTOMER_SORT;
  const sortField = CUSTOMER_SORT_FIELDS.includes(sortRaw as (typeof CUSTOMER_SORT_FIELDS)[number])
    ? (sortRaw as (typeof CUSTOMER_SORT_FIELDS)[number])
    : DEFAULT_CUSTOMER_SORT;
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

  let query = session.supabase
    .from("customers")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .gt("total_credit", 0)
    .order(sortField, { ascending: sortDir === "asc" })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, count, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load outstanding credit.", 500);
  }

  return apiSuccess(
    {
      items: (data ?? []).map((row) => mapCustomerRow(row as CustomerRow)),
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    },
    "Outstanding credit loaded.",
  );
}