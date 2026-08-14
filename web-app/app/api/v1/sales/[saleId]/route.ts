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
import { errorFromSaleMutation, mapSaleRow } from "@/lib/sales";
import { createServerAdminClient } from "@/lib/supabase/server";
import { parseSaleCorrect, UUID_RE } from "@/lib/validation/sales";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const { saleId } = await params;
  if (!UUID_RE.test(saleId)) return apiError("Invalid sale id.", 400);

  const { data: sale, error: dbError } = await session.supabase
    .from("sales")
    .select(
      "*, sale_items(*, product:products(name, sku)), customer:customers(full_name, phone), cashier:users(full_name), shop:shops(name, phone, email, address, receipt_footer)",
    )
    .eq("id", saleId)
    .single();

  if (dbError || !sale) {
    return apiError("Sale not found.", 404);
  }

  return apiSuccess(mapSaleRow(sale as Record<string, unknown>), "Sale loaded.");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const { saleId } = await params;
  if (!UUID_RE.test(saleId)) return apiError("Invalid sale id.", 400);

  const body = await request.json().catch(() => ({}));
  const { value, errors } = parseSaleCorrect(body);
  if (Object.keys(errors).length > 0) {
    return apiError("Validation failed.", 422, errors);
  }

  const admin = createServerAdminClient();
  const { data: sale, error: rpcError } = await admin.rpc("correct_sale", {
    p_sale_id: saleId,
    p_actor_id: session.user.id,
    p_shop_id: session.user.role_slug === ROLES.SUPER_ADMIN ? null : session.user.shop_id,
    p_reason: value.reason,
    p_items: JSON.stringify(value.items),
    p_payment_method: value.payment_method,
    p_discount: value.discount,
    p_amount_paid: value.amount_paid,
  });

  if (rpcError || !sale) {
    const mapped = errorFromSaleMutation(rpcError?.message ?? "");
    if (mapped) return apiError(mapped.message, mapped.status);
    return apiError("Unable to correct sale.", 500);
  }

  const saleIdOut = (sale as { id: string }).id;

  const { data: corrected, error: fetchError } = await admin
    .from("sales")
    .select("*, sale_items(*), customer:customers(full_name, phone), cashier:users(full_name)")
    .eq("id", saleIdOut)
    .single();

  if (fetchError || !corrected) {
    return apiError("Sale corrected but could not be loaded.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: (corrected as { shop_id: string }).shop_id,
    action: AUDIT_ACTIONS.SALE_CORRECTED,
    entity: "sale",
    entity_id: saleIdOut,
    reason: value.reason,
    ip: getClientIp(request),
  });

  return apiSuccess(mapSaleRow(corrected as Record<string, unknown>), "Sale corrected.", 200);
}
