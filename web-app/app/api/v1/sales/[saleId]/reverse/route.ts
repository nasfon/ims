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
import { parseSaleReverse, UUID_RE } from "@/lib/validation/sales";

export async function POST(
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
  const { value, errors } = parseSaleReverse(body);
  if (Object.keys(errors).length > 0) {
    return apiError("Validation failed.", 422, errors);
  }

  const admin = createServerAdminClient();
  const { data: sale, error: rpcError } = await admin.rpc("reverse_sale", {
    p_sale_id: saleId,
    p_actor_id: session.user.id,
    p_shop_id: session.user.role_slug === ROLES.SUPER_ADMIN ? null : session.user.shop_id,
    p_reason: value.reason,
  });

  if (rpcError || !sale) {
    const mapped = errorFromSaleMutation(rpcError?.message ?? "");
    if (mapped) return apiError(mapped.message, mapped.status);
    return apiError("Unable to reverse sale.", 500);
  }

  const saleIdOut = (sale as { id: string }).id;

  const { data: reversed, error: fetchError } = await admin
    .from("sales")
    .select("*, sale_items(*), customer:customers(full_name, phone), cashier:users(full_name)")
    .eq("id", saleIdOut)
    .single();

  if (fetchError || !reversed) {
    return apiError("Sale reversed but could not be loaded.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: (reversed as { shop_id: string }).shop_id,
    action: AUDIT_ACTIONS.SALE_REVERSED,
    entity: "sale",
    entity_id: saleIdOut,
    reason: value.reason,
    ip: getClientIp(request),
  });

  return apiSuccess(mapSaleRow(reversed as Record<string, unknown>), "Sale reversed.", 200);
}