import type { NextRequest } from "next/server";

import {
  apiError,
  apiSuccess,
  guardApiRole,
  guardApiUser,
} from "@/lib/api";
import { ROLES } from "@/lib/roles";
import { createServerAdminClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
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

  const { data: shop, error: shopError } = await admin
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .single();

  if (shopError || !shop) {
    return apiError("Shop not found.", 404);
  }

  const [{ data: assigned }, { data: available }] = await Promise.all([
    admin
      .from("users_with_email")
      .select("*")
      .eq("shop_id", shopId)
      .is("deleted_at", null)
      .order("full_name"),
    admin
      .from("users_with_email")
      .select("*")
      .is("shop_id", null)
      .is("deleted_at", null)
      .order("full_name"),
  ]);

  return apiSuccess(
    { assigned: assigned ?? [], available: available ?? [] },
    "Shop users loaded.",
  );
}