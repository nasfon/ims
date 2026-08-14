import type { NextRequest } from "next/server";

import {
  apiError,
  apiSuccess,
  guardApiRole,
  guardApiUser,
} from "@/lib/api";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { type AuthSession } from "@/lib/auth";
import { getClientIp } from "@/lib/request";
import { ROLES } from "@/lib/roles";
import {
  BUSINESS_SETTINGS_SELECT,
  mapBusinessSettingsRow,
} from "@/lib/settings";
import { createServerAdminClient } from "@/lib/supabase/server";
import { parseBusinessSettingsUpdate } from "@/lib/validation/settings";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves which shop's settings apply. Shop Admins are always scoped to
 * their own shop (session user's shop_id); Super Admins may target any shop
 * via `?shop_id=` and fall back to their own shop when the param is omitted.
 */
function resolveShopId(
  session: AuthSession,
  paramShopId: string | null,
): string | null {
  if (session.user.role_slug === ROLES.SUPER_ADMIN) {
    if (paramShopId) {
      return UUID_RE.test(paramShopId) ? paramShopId : null;
    }
    return session.user.shop_id;
  }
  return session.user.shop_id;
}

function parseShopName(row: Record<string, unknown>): string | null {
  const shop = row.shop as { name?: string | null } | null | undefined;
  return shop?.name ?? null;
}

function asRow(v: unknown): Record<string, unknown> {
  return v as Record<string, unknown>;
}

/**
 * GET /api/v1/settings/business
 * Returns the business settings for the current shop (Shop Admin) or the
 * shop selected via `?shop_id=` (Super Admin). Missing rows are provisioned
 * from the shop's name so the client always has something to render.
 */
export async function GET(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const paramShopId = request.nextUrl.searchParams.get("shop_id");
  const shopId = resolveShopId(session, paramShopId);
  if (!shopId) {
    return apiError("No shop selected.", 400);
  }

  const { data: row, error: fetchError } = await session.supabase
    .from("business_settings")
    .select(BUSINESS_SETTINGS_SELECT)
    .eq("shop_id", shopId)
    .single();

  if (row) {
    return apiSuccess(
      mapBusinessSettingsRow(asRow(row), parseShopName(asRow(row))),
      "Business settings loaded.",
    );
  }

  if (fetchError && fetchError.code !== "PGRST116") {
    return apiError("Unable to load business settings.", 500);
  }

  // Missing row: fetch the shop to seed a default and confirm it exists.
  const { data: shop, error: shopError } = await session.supabase
    .from("shops")
    .select("id, name")
    .eq("id", shopId)
    .single();

  if (shopError || !shop) {
    return apiError("Shop not found.", 404);
  }

  const admin = createServerAdminClient();
  const { data: inserted, error: insertError } = await admin
    .from("business_settings")
    .insert({ shop_id: shopId, business_name: shop.name as string })
    .select(BUSINESS_SETTINGS_SELECT)
    .single();

  if (insertError || !inserted) {
    return apiError("Unable to load business settings.", 500);
  }

  return apiSuccess(
    mapBusinessSettingsRow(asRow(inserted), shop.name as string),
    "Business settings loaded.",
  );
}

/**
 * PATCH /api/v1/settings/business
 * Updates business settings for the shop resolved like GET. Partial update:
 * only supplied keys are modified; explicit null clears optional fields.
 */
export async function PATCH(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const parsed = parseBusinessSettingsUpdate(body);
  if (Object.keys(parsed.errors).length > 0) {
    return apiError("Validation failed.", 422, parsed.errors);
  }

  const paramShopId = request.nextUrl.searchParams.get("shop_id");
  const shopId = resolveShopId(session, paramShopId);
  if (!shopId) {
    return apiError("No shop selected.", 400);
  }

  if (Object.keys(parsed.value).length === 0) {
    return apiError("No fields to update.", 400);
  }

  const admin = createServerAdminClient();

  // Confirm the target shop exists (also used to seed business_name on insert).
  const { data: shop, error: shopError } = await admin
    .from("shops")
    .select("id, name")
    .eq("id", shopId)
    .single();

  if (shopError || !shop) {
    return apiError("Shop not found.", 404);
  }

  const updates: Record<string, unknown> = { ...parsed.value };
  const { data: existing } = await admin
    .from("business_settings")
    .select("id")
    .eq("shop_id", shopId)
    .single();

  let result: Record<string, unknown>;
  if (existing) {
    const { data: updated, error: updateError } = await admin
      .from("business_settings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select(BUSINESS_SETTINGS_SELECT)
      .single();

    if (updateError || !updated) {
      return apiError("Unable to update business settings.", 500);
    }
    result = asRow(updated);
  } else {
    const insert = {
      shop_id: shopId,
      business_name: (parsed.value.business_name as string) ?? (shop.name as string),
      ...updates,
    };
    const { data: inserted, error: insertError } = await admin
      .from("business_settings")
      .insert(insert)
      .select(BUSINESS_SETTINGS_SELECT)
      .single();

    if (insertError || !inserted) {
      return apiError("Unable to create business settings.", 500);
    }
    result = asRow(inserted);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: shopId,
    action: AUDIT_ACTIONS.SETTINGS_UPDATED,
    entity: "business_settings",
    entity_id: shopId,
    reason: null,
    ip: getClientIp(request),
  });

  return apiSuccess(
    mapBusinessSettingsRow(result, parseShopName(result) ?? (shop.name as string)),
    "Business settings updated.",
  );
}