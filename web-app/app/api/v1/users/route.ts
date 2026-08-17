import { randomBytes } from "node:crypto";

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
import {
  canAssignRole,
  resolveUserRole,
} from "@/lib/services/users";
import { createServerAdminClient } from "@/lib/supabase/server";
import { parseUserCreate } from "@/lib/validation/users";

const PAGE_LIMIT = 25;
const PAGE_LIMIT_MAX = 100;
const SEARCH_MAX = 100;

function generatePassword(): string {
  return randomBytes(12).toString("base64url");
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
  const search = (searchParams.get("search") ?? "").trim().slice(0, SEARCH_MAX);
  const role = searchParams.get("role")?.trim();

  let query = session.supabase
    .from("users_with_email")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("full_name")
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (role) {
    query = query.eq("role_slug", role);
  }

  const { data, count, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load users.", 500);
  }

  return apiSuccess(
    {
      items: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    },
    "Users loaded.",
  );
}

export async function POST(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const { value, errors } = parseUserCreate(body);
  if (Object.keys(errors).length > 0) {
    return apiError("Validation failed.", 422, errors);
  }

  const actorRole = session.user.role_slug;

  // Shop Admins operate within their assigned shop only.
  if (actorRole === ROLES.SHOP_ADMIN && value.shop_id !== session.user.shop_id) {
    return apiError("You can only create users in your own shop.", 403);
  }

  const admin = createServerAdminClient();

  const resolved = await resolveUserRole(admin, value.role_id, value.role_slug);
  if (resolved instanceof NextResponse) return resolved;
  const roleError = canAssignRole(actorRole, resolved.role_slug);
  if (roleError) return roleError;

  const password = value.password ?? generatePassword();
  const passwordGenerated = value.password == null;

  const { data: authUser, error: createError } = await admin.auth.admin.createUser({
    email: value.email ?? "",
    password,
    email_confirm: true,
    user_metadata: { full_name: value.full_name },
  });

  if (createError || !authUser?.user) {
    const message =
      createError?.status === 422 || /already registered/i.test(createError?.message ?? "")
        ? "An account with this email already exists."
        : "Unable to create user.";
    return apiError(message, createError?.status === 422 ? 409 : 400);
  }

  const userRow = {
    id: authUser.user.id,
    shop_id: value.shop_id ?? null,
    role_id: resolved.role_id,
    full_name: value.full_name ?? "",
    phone: value.phone ?? null,
    is_active: value.is_active ?? true,
  };

  const { error: insertError } = await admin.from("users").insert(userRow);
  if (insertError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return apiError("Unable to create user.", 500);
  }

  if (value.is_active === false) {
    await admin.auth.admin.updateUserById(authUser.user.id, { ban_duration: "876000h" });
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: value.shop_id ?? null,
    action: AUDIT_ACTIONS.USER_CREATED,
    entity: "user",
    entity_id: authUser.user.id,
    ip: getClientIp(request),
  });

  const { data: created } = await admin
    .from("users_with_email")
    .select("*")
    .eq("id", authUser.user.id)
    .single();

  return apiSuccess(
    { ...created, temporaryPassword: passwordGenerated ? password : undefined },
    "User created.",
    201,
  );
}