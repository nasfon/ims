import type { NextRequest } from "next/server";

import { apiError, apiSuccess, guardApiUser } from "@/lib/api";
import { UUID_RE } from "@/lib/validation/customers";

const PAGE_LIMIT = 25;
const PAGE_LIMIT_MAX = 100;

const SALE_STATUSES = ["completed", "corrected", "reversed"] as const;
type SaleStatus = (typeof SALE_STATUSES)[number];

/**
 * Purchase history for a customer. Depends on the Phase 4 `sales` / `sale_items`
 * tables (Database Design §3.6–3.7) — this route returns 500 until they exist.
 * RLS on `sales` scopes the rows to the caller's shop.
 */
type SaleHistoryItem = {
  id: string;
  shop_id: string;
  customer_id: string;
  cashier_id: string;
  receipt_number: string;
  subtotal: number;
  discount: number;
  total: number;
  amount_paid: number;
  remaining_credit: number;
  payment_method: string;
  status: SaleStatus;
  created_at: string;
  items: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
};

/** Coerces numeric columns (PostgREST returns numeric as strings). */
function mapSaleRow(row: Record<string, unknown>): SaleHistoryItem {
  const items = (row.items as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: row.id as string,
    shop_id: row.shop_id as string,
    customer_id: row.customer_id as string,
    cashier_id: row.cashier_id as string,
    receipt_number: row.receipt_number as string,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    amount_paid: Number(row.amount_paid),
    remaining_credit: Number(row.remaining_credit),
    payment_method: row.payment_method as string,
    status: row.status as SaleStatus,
    created_at: row.created_at as string,
    items: items.map((item) => ({
      id: item.id as string,
      product_id: item.product_id as string,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total_price: Number(item.total_price),
    })),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const { customerId } = await params;
  if (!UUID_RE.test(customerId)) return apiError("Invalid customer id.", 400);

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    PAGE_LIMIT_MAX,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? String(PAGE_LIMIT), 10) || PAGE_LIMIT),
  );
  const status = searchParams.get("status")?.trim();

  let query = session.supabase
    .from("sales")
    .select("*, sale_items(*)", { count: "exact" })
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status && (SALE_STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status);
  }

  const { data, count, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load purchase history.", 500);
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
    "Purchase history loaded.",
  );
}