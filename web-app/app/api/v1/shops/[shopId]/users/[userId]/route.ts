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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string; userId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN]);
  if (forbidden) return forbidden;

  const { shopId, userId } = await params;
  if (!UUID_RE.test(shopId) || !UUID_RE.test(userId)) {
    return apiError("Invalid shop or user id.", 400);
  }

  const admin = createServerAdminClient();

  const [{ data: shop }, { data: target, error: targetError }] =
    await Promise.all([
      admin.from("shops").select("id").eq("id", shopId).single(),
      admin
        .from("users_with_email")
        .select("*")
        .eq("id", userId)
        .is("deleted_at", null)
        .single(),
    ]);

  if (!shop) return apiError("Shop not found.", 404);
  if (targetError || !target) return apiError("User not found.", 404);

  const { error: updateError } = await admin
    .from("users")
    .update({ shop_id: shopId })
    .eq("id", userId)
    .is("deleted_at", null);

  if (updateError) {
    return apiError("Unable to assign user to shop.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: shopId,
    action: AUDIT_ACTIONS.USER_ASSIGNED,
    entity: "user",
    entity_id: userId,
    ip: getClientIp(request),
  });

  return apiSuccess({ id: userId, shop_id: shopId }, "User assigned to shop.");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string; userId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN]);
  if (forbidden) return forbidden;

  const { shopId, userId } = await params;
  if (!UUID_RE.test(shopId) || !UUID_RE.test(userId)) {
    return apiError("Invalid shop or user id.", 400);
  }

  const admin = createServerAdminClient();

  const { data: target, error: targetError } = await admin
    .from("users_with_email")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();

  if (targetError || !target) return apiError("User not found.", 404);
  if (target.shop_id !== shopId) {
    return apiError("User is not assigned to this shop.", 409);
  }

  const { error: updateError } = await admin
    .from("users")
    .update({ shop_id: null })
    .eq("id", userId)
    .is("deleted_at", null);

  if (updateError) {
    return apiError("Unable to unassign user from shop.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: shopId,
    action: AUDIT_ACTIONS.USER_UNASSIGNED,
    entity: "user",
    entity_id: userId,
    ip: getClientIp(request),
  });

  return apiSuccess({ id: userId, shop_id: null }, "User unassigned from shop.");
}