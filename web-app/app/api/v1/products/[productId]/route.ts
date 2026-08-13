import type { NextRequest } from "next/server";

import {
  apiError,
  apiSuccess,
  guardApiRole,
  guardApiUser,
} from "@/lib/api";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import {
  PRODUCT_FIELDS,
  mapProductRow,
  type ProductRow,
} from "@/lib/products";
import { getClientIp } from "@/lib/request";
import { ROLES } from "@/lib/roles";
import { adjustStock } from "@/lib/services/stock";
import { createServerAdminClient } from "@/lib/supabase/server";
import { UUID_RE, parseProductUpdate } from "@/lib/validation/products";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const { productId } = await params;
  if (!UUID_RE.test(productId)) return apiError("Invalid product id.", 400);

  const { data: product, error: dbError } = await session.supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("id", productId)
    .is("deleted_at", null)
    .single();

  if (dbError || !product) {
    return apiError("Product not found.", 404);
  }

  return apiSuccess(mapProductRow(product as ProductRow), "Product loaded.");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const { productId } = await params;
  if (!UUID_RE.test(productId)) return apiError("Invalid product id.", 400);

  const body = await request.json().catch(() => ({}));
  const { value, errors } = parseProductUpdate(body);
  if (Object.keys(errors).length > 0) {
    return apiError("Validation failed.", 422, errors);
  }
  if (Object.keys(value).length === 0) {
    return apiError("No fields to update.", 400);
  }

  const admin = createServerAdminClient();

  const { data: target, error: targetError } = await admin
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("id", productId)
    .is("deleted_at", null)
    .single();

  if (targetError || !target) return apiError("Product not found.", 404);

  const actorRole = session.user.role_slug;
  if (actorRole === ROLES.SHOP_ADMIN && target.shop_id !== session.user.shop_id) {
    return apiError("Product not found.", 404);
  }

  // Quantity changes must go through adjust_stock so the movement is atomic
  // and recorded in stock_history with the acting user. Non-quantity edits
  // (name, sku, price, etc.) use a plain update.
  const { quantity, ...metadataPatch } = value;

  let product: ProductRow | null = null;

  if (metadataPatch && Object.keys(metadataPatch).length > 0) {
    const { data, error: dbError } = await admin
      .from("products")
      .update(metadataPatch)
      .eq("id", productId)
      .select(PRODUCT_FIELDS)
      .single();

    if (dbError || !data) {
      if (dbError?.code === "23505") {
        return apiError("A product with this SKU already exists in this shop.", 409);
      }
      return apiError("Unable to update product.", 500);
    }
    product = data as ProductRow;
  }

  if (quantity != null && quantity !== target.quantity) {
    const result = await adjustStock(admin, {
      productId,
      quantityChange: quantity - target.quantity,
      changeType: "manual_adjustment",
      actorUserId: session.user.id,
    });

    if (!result.ok) return result.error;
    product = result.data;
  }

  if (!product) {
    return apiError("No fields to update.", 400);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: product.shop_id,
    action: AUDIT_ACTIONS.PRODUCT_UPDATED,
    entity: "product",
    entity_id: product.id,
    ip: getClientIp(request),
  });

  return apiSuccess(mapProductRow(product as ProductRow), "Product updated.");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const { productId } = await params;
  if (!UUID_RE.test(productId)) return apiError("Invalid product id.", 400);

  const admin = createServerAdminClient();

  const { data: target, error: targetError } = await admin
    .from("products")
    .select("id, shop_id")
    .eq("id", productId)
    .is("deleted_at", null)
    .single();

  if (targetError || !target) return apiError("Product not found.", 404);

  const actorRole = session.user.role_slug;
  if (actorRole === ROLES.SHOP_ADMIN && target.shop_id !== session.user.shop_id) {
    return apiError("Product not found.", 404);
  }

  // Soft delete: mark the row, keeping history and past references intact
  // (Database Design §7). No physical delete.
  const { error: dbError } = await admin
    .from("products")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: session.user.id,
      is_active: false,
    })
    .eq("id", productId)
    .is("deleted_at", null);

  if (dbError) {
    return apiError("Unable to delete product.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: target.shop_id,
    action: AUDIT_ACTIONS.PRODUCT_DELETED,
    entity: "product",
    entity_id: productId,
    ip: getClientIp(request),
  });

  return apiSuccess({ id: productId }, "Product deleted.");
}