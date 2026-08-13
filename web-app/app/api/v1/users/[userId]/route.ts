import { NextResponse, type NextRequest } from "next/server";

import {
  apiError,
  apiSuccess,
  guardApiRole,
  guardApiUser,
} from "@/lib/api";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { ROLES } from "@/lib/roles";
import { getClientIp } from "@/lib/request";
import { canAssignRole, resolveUserRole } from "@/lib/services/users";
import { createServerAdminClient } from "@/lib/supabase/server";
import { parseUserUpdate, UUID_RE } from "@/lib/validation/users";

/** 100 years — effectively bans the auth user until explicitly unbanned. */
const BAN_DURATION = "876000h";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const { userId } = await params;
  if (!UUID_RE.test(userId)) return apiError("Invalid user id.", 400);

  const { data: user, error: dbError } = await session.supabase
    .from("users_with_email")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();

  if (dbError || !user) {
    return apiError("User not found.", 404);
  }

  return apiSuccess(user, "User loaded.");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const { userId } = await params;
  if (!UUID_RE.test(userId)) return apiError("Invalid user id.", 400);

  const body = await request.json().catch(() => ({}));
  const { value, errors } = parseUserUpdate(body);
  if (Object.keys(errors).length > 0) {
    return apiError("Validation failed.", 422, errors);
  }

  const admin = createServerAdminClient();

  const { data: target, error: targetError } = await admin
    .from("users_with_email")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();

  if (targetError || !target) return apiError("User not found.", 404);

  const actorRole = session.user.role_slug;
  if (actorRole === ROLES.SHOP_ADMIN) {
    if (target.shop_id !== session.user.shop_id) return apiError("User not found.", 404);
    if (target.role_slug === ROLES.SUPER_ADMIN) return apiError("User not found.", 404);
    if (value.shop_id !== undefined) {
      return apiError("You cannot move users between shops.", 403);
    }
  }

  const patch: Record<string, unknown> = {};

  if (value.full_name !== undefined) patch.full_name = value.full_name;
  if (value.phone !== undefined) patch.phone = value.phone;
  if (value.shop_id !== undefined) patch.shop_id = value.shop_id;
  if (value.is_active !== undefined) patch.is_active = value.is_active;

  if (value.role_id !== undefined || value.role_slug !== undefined) {
    const resolved = await resolveUserRole(admin, value.role_id ?? null, value.role_slug ?? null);
    if (resolved instanceof NextResponse) return resolved;
    const roleError = canAssignRole(actorRole, resolved.role_slug);
    if (roleError) return roleError;
    patch.role_id = resolved.role_id;
  }

  if (Object.keys(patch).length === 0 && value.email === undefined) {
    return apiError("No fields to update.", 400);
  }

  // Email lives in auth.users.
  if (value.email !== undefined) {
    const { error: emailError } = await admin.auth.admin.updateUserById(userId, {
      email: value.email ?? undefined,
    });
    if (emailError) {
      return apiError(
        /already registered|duplicate/i.test(emailError.message)
          ? "That email is already in use."
          : "Unable to update email.",
        emailError.status && emailError.status >= 400 && emailError.status < 500 ? 409 : 400,
      );
    }
  }

  // is_active transition → disable/enable the auth user server-side.
  if (value.is_active !== undefined && value.is_active !== target.is_active) {
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: value.is_active ? "none" : BAN_DURATION,
    });
  }

  const { error: updateError } = await admin
    .from("users")
    .update(patch)
    .eq("id", userId);

  if (updateError) {
    return apiError("Unable to update user.", 500);
  }

  if (value.is_active === false) {
    await recordAudit(admin, {
      user_id: session.user.id,
      shop_id: target.shop_id,
      action: AUDIT_ACTIONS.USER_DEACTIVATED,
      entity: "user",
      entity_id: userId,
      ip: getClientIp(request),
    });
  }
  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: target.shop_id,
    action: AUDIT_ACTIONS.USER_UPDATED,
    entity: "user",
    entity_id: userId,
    ip: getClientIp(request),
  });

  const { data: updated } = await admin
    .from("users_with_email")
    .select("*")
    .eq("id", userId)
    .single();

  return apiSuccess(updated, "User updated.");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const { userId } = await params;
  if (!UUID_RE.test(userId)) return apiError("Invalid user id.", 400);

  if (userId === session.user.id) {
    return apiError("You cannot delete your own account.", 400);
  }

  const admin = createServerAdminClient();

  const { data: target, error: targetError } = await admin
    .from("users_with_email")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();

  if (targetError || !target) return apiError("User not found.", 404);

  const actorRole = session.user.role_slug;
  if (actorRole === ROLES.SHOP_ADMIN) {
    if (target.shop_id !== session.user.shop_id) return apiError("User not found.", 404);
    if (target.role_slug === ROLES.SUPER_ADMIN) return apiError("User not found.", 404);
  }

  const { error: deleteError } = await admin
    .from("users")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: session.user.id,
      is_active: false,
    })
    .eq("id", userId)
    .is("deleted_at", null);

  if (deleteError) {
    return apiError("Unable to delete user.", 500);
  }

  // Soft-deleted users must not be able to sign back in.
  await admin.auth.admin.updateUserById(userId, { ban_duration: BAN_DURATION });

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: target.shop_id,
    action: AUDIT_ACTIONS.USER_DELETED,
    entity: "user",
    entity_id: userId,
    ip: getClientIp(request),
  });

  return apiSuccess({ id: userId }, "User deleted.");
}