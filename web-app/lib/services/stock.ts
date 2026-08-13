import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { apiError } from "@/lib/api";
import type { ProductRow } from "@/lib/products";
import type { StockChangeType } from "@/types/stock";

export type AdjustStockInput = {
  productId: string;
  quantityChange: number;
  changeType?: StockChangeType;
  referenceId?: string | null;
  actorUserId: string | null;
};

export type AdjustStockResult =
  | { ok: true; data: ProductRow }
  | { ok: false; error: ReturnType<typeof apiError> };

/**
 * Atomically adjusts a product's stock through the `adjust_stock` DB function
 * (row lock + insufficient-stock guard + stock_history record in one
 * transaction). The error from `raise exception` surfaces as the PostgREST
 * message, which we map back to a friendly API response.
 */
export async function adjustStock(
  admin: SupabaseClient,
  input: AdjustStockInput,
): Promise<AdjustStockResult> {
  const { data, error } = await admin.rpc("adjust_stock", {
    p_product_id: input.productId,
    p_quantity_change: input.quantityChange,
    p_change_type: input.changeType ?? "manual_adjustment",
    p_reference_id: input.referenceId ?? null,
    p_created_by: input.actorUserId,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("product_not_found")) {
      return { ok: false, error: apiError("Product not found.", 404) };
    }
    if (message.includes("insufficient_stock")) {
      return { ok: false, error: apiError("Insufficient stock.", 409) };
    }
    if (message.includes("invalid_change_type")) {
      return { ok: false, error: apiError("Invalid stock change type.", 422) };
    }
    return { ok: false, error: apiError("Unable to adjust stock.", 500) };
  }

  if (!data) {
    return { ok: false, error: apiError("Unable to adjust stock.", 500) };
  }

  return { ok: true, data: data as ProductRow };
}