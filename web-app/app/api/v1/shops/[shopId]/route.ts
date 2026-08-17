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
import { createServerAdminClient } from "@/lib/supabase/server";
import { parseShopUpdate } from "@/lib/validation/shops";

const SHOP_FIELDS =
  "id, name, phone, email, address, logo_url, receipt_footer, is_active, created_at, updated_at";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const { shopId } = await params;
  if (!UUID_RE.test(shopId)) {
    return apiError("Invalid shop id.", 400);
  }

  const { data: shop, error: dbError } = await session.supabase
    .from("shops")
    .select(SHOP_FIELDS)
    .eq("id", shopId)
    .single();

  if (dbError || !shop) {
    return apiError("Shop not found.", 404);
  }

  return apiSuccess(shop, "Shop loaded.");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN]);
  if (forbidden) return forbidden;

  const { shopId } = await params;
  if (!UUID_RE.test(shopId)) {
    return apiError("Invalid shop id.", 400);
  }

  const body = await request.json().catch(() => ({}));
  const { value, errors } = parseShopUpdate(body);
  if (Object.keys(errors).length > 0) {
    return apiError("Validation failed.", 422, errors);
  }
  if (Object.keys(value).length === 0) {
    return apiError("No fields to update.", 400);
  }

  const admin = createServerAdminClient();
  const { data: shop, error: dbError } = await admin
    .from("shops")
    .update(value)
    .eq("id", shopId)
    .select(SHOP_FIELDS)
    .single();

  if (dbError || !shop) {
    return apiError("Shop not found.", 404);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: null,
    action: AUDIT_ACTIONS.SHOP_UPDATED,
    entity: "shop",
    entity_id: shop.id,
    ip: getClientIp(request),
  });

  return apiSuccess(shop, "Shop updated.");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN]);
  if (forbidden) return forbidden;

  const { shopId } = await params;
  if (!UUID_RE.test(shopId)) {
    return apiError("Invalid shop id.", 400);
  }

  const admin = createServerAdminClient();

  // A shop with active staff must have them deactivated (deassigned) first.
  const { count } = await admin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .is("deleted_at", null);

  if ((count ?? 0) > 0) {
    return apiError(
      "Shop has assigned staff. Deactivate them before deleting this shop.",
      409,
    );
  }

  // Soft-deleted users still reference the shop via the `on delete restrict`
  // FK, so clear it before deleting.
  const { error: unassignError } = await admin
    .from("users")
    .update({ shop_id: null })
    .eq("shop_id", shopId);

  if (unassignError) {
    return apiError("Unable to unassign staff before deleting the shop.", 500);
  }

  const { data: shop, error: dbError } = await admin
    .from("shops")
    .delete()
    .eq("id", shopId)
    .select(SHOP_FIELDS)
    .single();

  if (dbError || !shop) {
    return apiError(
      dbError
        ? /foreign key|restrict/i.test(dbError.message)
          ? "Shop has related data that blocks deletion."
          : "Unable to delete shop."
        : "Shop not found.",
      404,
    );
  }

  // Audited after the row is gone so the entry survives the
  // `audit_logs.shop_id` ON DELETE CASCADE.
  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: null,
    action: AUDIT_ACTIONS.SHOP_DELETED,
    entity: "shop",
    entity_id: shop.id,
    ip: getClientIp(request),
  });

  return apiSuccess({ id: shop.id }, "Shop deleted.");
}