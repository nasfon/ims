import type { NextRequest } from "next/server";

import {
  apiError,
  apiSuccess,
  guardApiRole,
  guardApiUser,
} from "@/lib/api";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import {
  CUSTOMER_FIELDS,
  CUSTOMER_SORT_FIELDS,
  DEFAULT_CUSTOMER_SORT,
  mapCustomerRow,
  type CustomerRow,
} from "@/lib/customers";
import { getClientIp } from "@/lib/request";
import { ROLES } from "@/lib/roles";
import { createServerAdminClient } from "@/lib/supabase/server";
import { parseCustomerCreate } from "@/lib/validation/customers";

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
  // RLS scopes rows to the caller's shop (or all shops for Super Admin).
  const search = (searchParams.get("search") ?? "").trim().slice(0, SEARCH_MAX);

  const sortRaw = searchParams.get("sort") ?? DEFAULT_CUSTOMER_SORT;
  const sortField = CUSTOMER_SORT_FIELDS.includes(sortRaw as (typeof CUSTOMER_SORT_FIELDS)[number])
    ? (sortRaw as (typeof CUSTOMER_SORT_FIELDS)[number])
    : DEFAULT_CUSTOMER_SORT;
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

  const shopId = searchParams.get("shop_id")?.trim();

  let query = session.supabase
    .from("customers")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order(sortField, { ascending: sortDir === "asc" })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (shopId && session.user.role_slug === ROLES.SUPER_ADMIN) {
    query = query.eq("shop_id", shopId);
  }

  const { data, count, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load customers.", 500);
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
    "Customers loaded.",
  );
}

export async function POST(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const { value, errors } = parseCustomerCreate(body);
  if (Object.keys(errors).length > 0) {
    return apiError("Validation failed.", 422, errors);
  }

  const actorRole = session.user.role_slug;

  // Shop Admins operate within their assigned shop only.
  if (actorRole === ROLES.SHOP_ADMIN && value.shop_id !== session.user.shop_id) {
    return apiError("You can only create customers in your own shop.", 403);
  }

  const admin = createServerAdminClient();
  const insert = {
    shop_id: value.shop_id ?? "",
    full_name: value.full_name ?? "",
    phone: value.phone ?? "",
    email: value.email ?? null,
    address: value.address ?? null,
  };

  const { data, error: dbError } = await admin
    .from("customers")
    .insert(insert)
    .select(CUSTOMER_FIELDS)
    .single();

  if (dbError || !data) {
    return apiError("Unable to create customer.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: data.shop_id,
    action: AUDIT_ACTIONS.CUSTOMER_CREATED,
    entity: "customer",
    entity_id: data.id,
    ip: getClientIp(request),
  });

  return apiSuccess(mapCustomerRow(data as CustomerRow), "Customer created.", 201);
}