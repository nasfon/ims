import { NextResponse, type NextRequest } from "next/server";

import { getClientIp } from "@/lib/request";
import { createClient, createServerAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Audit logout before the session is destroyed (Security & RBAC §10).
    const admin = createServerAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("shop_id")
      .eq("id", user.id)
      .single();
    await admin.rpc("record_audit", {
      p_user_id: user.id,
      p_shop_id: profile?.shop_id ?? null,
      p_action: "logout",
      p_entity: "user",
      p_entity_id: user.id,
      p_reason: null,
      p_ip_address: getClientIp(request),
    });
  }

  await supabase.auth.signOut();

  return NextResponse.json({
    success: true,
    message: "Signed out successfully.",
    data: {},
  });
}