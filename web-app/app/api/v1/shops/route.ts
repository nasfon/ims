import type { NextRequest } from "next/server";

import {
  apiError,
  apiSuccess,
  guardApiRole,
  guardApiUser,
} from "@/lib/api";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { ROLES } from "@/lib/roles";
import { getClientIp } from "@/lib/request";
import { createServerAdminClient } from "@/lib/supabase/server";
import { parseShopCreate } from "@/lib/validation/shops";

const SHOP_FIELDS =
  "id, name, phone, email, address, logo_url, receipt_footer, is_active, created_at, updated_at";

export async function GET() {
  const { session, error } = await guardApiUser();
  if (error) return error;

  // RLS scopes rows: Super Admin sees all shops, Shop Admin/Cashier only
  // their assigned shop (Security & RBAC §5).
  const { data, error: dbError } = await session.supabase
    .from("shops")
    .select(SHOP_FIELDS)
    .order("name");

  if (dbError) {
    return apiError("Unable to load shops.", 500);
  }

  return apiSuccess(data ?? [], "Shops loaded.");
}

export async function POST(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const { value, errors } = parseShopCreate(body);
  if (Object.keys(errors).length > 0) {
    return apiError("Validation failed.", 422, errors);
  }

  const admin = createServerAdminClient();
  const { data, error: dbError } = await admin
    .from("shops")
    .insert(value)
    .select(SHOP_FIELDS)
    .single();

  if (dbError || !data) {
    return apiError("Unable to create shop.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: null,
    action: AUDIT_ACTIONS.SHOP_CREATED,
    entity: "shop",
    entity_id: data.id,
    ip: getClientIp(request),
  });

  return apiSuccess(data, "Shop created.", 201);
}