import type { NextRequest } from "next/server";

import {
  apiError,
  apiSuccess,
  guardApiRole,
  guardApiUser,
} from "@/lib/api";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { ROLES } from "@/lib/roles";
import {
  DEFAULT_SALE_SORT,
  SALE_SORT_FIELDS,
  mapSaleRow,
} from "@/lib/sales";
import { createServerAdminClient } from "@/lib/supabase/server";
import { parseSaleCreate } from "@/lib/validation/sales";

const PAGE_LIMIT = 25;
const PAGE_LIMIT_MAX = 100;
const SEARCH_MAX = 100;

function errorFromCreate(message: string) {
  if (message.includes("product_not_found")) {
    return apiError("One or more products were not found.", 404);
  }
  if (message.includes("insufficient_stock")) {
    return apiError("Insufficient stock for one or more items.", 409);
  }
  if (message.includes("product_inactive")) {
    return apiError("One or more products are inactive.", 409);
  }
  if (message.includes("duplicate_product")) {
    return apiError("Each product can only appear once.", 422);
  }
  if (message.includes("invalid_item") || message.includes("empty_items")) {
    return apiError("Sale items are invalid.", 422);
  }
  if (message.includes("invalid_discount")) {
    return apiError("Discount cannot exceed the subtotal.", 422);
  }
  if (message.includes("amount_paid_exceeds_total")) {
    return apiError("Amount paid cannot exceed the sale total.", 422);
  }
  if (message.includes("customer_not_found")) {
    return apiError("Customer not found.", 404);
  }
  if (message.includes("cashier_not_found") || message.includes("shop_not_found")) {
    return apiError("Cashier or shop not found.", 404);
  }
  if (message.includes("invalid_payment_method")) {
    return apiError("Invalid payment method.", 422);
  }
  return null;
}

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
  const status = searchParams.get("status")?.trim();
  const customerId = searchParams.get("customer_id")?.trim();
  const cashierId = searchParams.get("cashier_id")?.trim();
  const paymentMethod = searchParams.get("payment_method")?.trim();
  const dateFrom = searchParams.get("date_from")?.trim();
  const dateTo = searchParams.get("date_to")?.trim();

  const sortRaw = searchParams.get("sort") ?? DEFAULT_SALE_SORT;
  const sortField = SALE_SORT_FIELDS.includes(sortRaw as (typeof SALE_SORT_FIELDS)[number])
    ? (sortRaw as (typeof SALE_SORT_FIELDS)[number])
    : DEFAULT_SALE_SORT;
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  let query = session.supabase
    .from("sales")
    .select("*, customer:customers(full_name, phone), cashier:users(full_name)", {
      count: "exact",
    })
    .order(sortField, { ascending: sortDir === "asc" })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.or(`receipt_number.ilike.%${search}%`);
  }
  if (status) query = query.eq("status", status);
  if (customerId) query = query.eq("customer_id", customerId);
  if (cashierId) query = query.eq("cashier_id", cashierId);
  if (paymentMethod) query = query.eq("payment_method", paymentMethod);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data, count, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load sales.", 500);
  }

  return apiSuccess(
    {
      items: (data ?? []).map((row) => mapSaleRow(row as Record<string, unknown>)),
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    },
    "Sales loaded.",
  );
}

export async function POST(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN, ROLES.CASHIER]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const { value, errors } = parseSaleCreate(body);
  if (Object.keys(errors).length > 0) {
    return apiError("Validation failed.", 422, errors);
  }

  const actorRole = session.user.role_slug;
  const shopId =
    actorRole === ROLES.SUPER_ADMIN
      ? value.shop_id ?? ""
      : session.user.shop_id ?? "";

  if (!shopId) {
    return apiError(actorRole === ROLES.SUPER_ADMIN ? "shop_id is required." : "No shop assigned.", 422);
  }

  const admin = createServerAdminClient();
  const { data: sale, error: rpcError } = await admin.rpc("create_sale", {
    p_shop_id: shopId,
    p_cashier_id: session.user.id,
    p_customer_id: value.customer_id ?? null,
    p_items: value.items,
    p_discount: value.discount,
    p_payment_method: value.payment_method,
    p_amount_paid: value.amount_paid,
  });

  if (rpcError || !sale) {
    const mapped = errorFromCreate(rpcError?.message ?? "");
    if (mapped) return mapped;
    return apiError("Unable to create sale.", 500);
  }

  const saleId = (sale as { id: string }).id;

  const { data: created, error: fetchError } = await admin
    .from("sales")
    .select("*, sale_items(*), customer:customers(full_name, phone), cashier:users(full_name)")
    .eq("id", saleId)
    .single();

  if (fetchError || !created) {
    return apiError("Sale created but could not be loaded.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: shopId,
    action: AUDIT_ACTIONS.SALE_CREATED,
    entity: "sale",
    entity_id: saleId,
    ip: getClientIp(request),
  });

  return apiSuccess(mapSaleRow(created as Record<string, unknown>), "Sale created.", 201);
}