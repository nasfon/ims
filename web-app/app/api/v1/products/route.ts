import type { NextRequest } from "next/server";

import {
  apiError,
  apiSuccess,
  guardApiRole,
  guardApiUser,
} from "@/lib/api";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import {
  DEFAULT_PRODUCT_SORT,
  PRODUCT_FIELDS,
  PRODUCT_SORT_FIELDS,
  mapProductRow,
  type ProductRow,
} from "@/lib/products";
import { getClientIp } from "@/lib/request";
import { ROLES } from "@/lib/roles";
import { createServerAdminClient } from "@/lib/supabase/server";
import { parseProductCreate } from "@/lib/validation/products";

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

  const sortRaw = searchParams.get("sort") ?? DEFAULT_PRODUCT_SORT;
  const sortField = PRODUCT_SORT_FIELDS.includes(sortRaw as (typeof PRODUCT_SORT_FIELDS)[number])
    ? (sortRaw as (typeof PRODUCT_SORT_FIELDS)[number])
    : DEFAULT_PRODUCT_SORT;
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

  const status = searchParams.get("status");
  const lowStock = searchParams.get("lowStock") === "true";
  const shopId = searchParams.get("shop_id")?.trim();

  let query = session.supabase
    .from("products")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order(sortField, { ascending: sortDir === "asc" })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }
  if (status === "active" || status === "inactive") {
    query = query.eq("is_active", status === "active");
  }
  if (lowStock) {
    query = query.or("quantity.lte.\`minimum_stock\`");
  }
  if (shopId && session.user.role_slug === ROLES.SUPER_ADMIN) {
    query = query.eq("shop_id", shopId);
  }

  const { data, count, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load products.", 500);
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
    "Products loaded.",
  );
}

export async function POST(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const { value, errors } = parseProductCreate(body);
  if (Object.keys(errors).length > 0) {
    return apiError("Validation failed.", 422, errors);
  }

  const actorRole = session.user.role_slug;

  // Shop Admins operate within their assigned shop only.
  if (actorRole === ROLES.SHOP_ADMIN && value.shop_id !== session.user.shop_id) {
    return apiError("You can only create products in your own shop.", 403);
  }

  const admin = createServerAdminClient();
  const insert = {
    shop_id: value.shop_id ?? "",
    name: value.name ?? "",
    sku: value.sku ?? "",
    quantity: value.quantity ?? 0,
    selling_price: value.selling_price ?? 0,
    minimum_stock: value.minimum_stock ?? 0,
    is_active: value.is_active ?? true,
  };

  const { data, error: dbError } = await admin
    .from("products")
    .insert(insert)
    .select(PRODUCT_FIELDS)
    .single();

  if (dbError || !data) {
    if (dbError?.code === "23505") {
      return apiError("A product with this SKU already exists in this shop.", 409);
    }
    return apiError("Unable to create product.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: data.shop_id,
    action: AUDIT_ACTIONS.PRODUCT_CREATED,
    entity: "product",
    entity_id: data.id,
    ip: getClientIp(request),
  });

  return apiSuccess(mapProductRow(data as ProductRow), "Product created.", 201);
}