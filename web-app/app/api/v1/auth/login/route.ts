import { NextResponse, type NextRequest } from "next/server";

import { createClient, createServerAdminClient } from "@/lib/supabase/server";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as LoginBody;
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { success: false, message: "Email and password are required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message === "Invalid login credentials"
          ? "Invalid email or password."
          : error?.message ?? "Unable to sign in.",
      },
      { status: 401 },
    );
  }

  const { user, session } = data;

  // Forbid inactive accounts from logging in.
  const { data: profile } = await supabase
    .from("users")
    .select("id, is_active, full_name, shop_id, role_id")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { success: false, message: "This account is deactivated. Contact an administrator." },
      { status: 403 },
    );
  }

  // Audit login (Security & RBAC §10).
  const admin = createServerAdminClient();
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;
  await admin.rpc("record_audit", {
    p_user_id: user.id,
    p_shop_id: profile.shop_id,
    p_action: "login",
    p_entity: "user",
    p_entity_id: user.id,
    p_reason: null,
    p_ip_address: ipAddress,
  });

  return NextResponse.json({
    success: true,
    message: "Signed in successfully.",
    data: {
      accessToken: session.access_token,
      user: {
        id: user.id,
        email: user.email,
        full_name: profile.full_name,
        is_active: profile.is_active,
        shop_id: profile.shop_id,
        role_id: profile.role_id,
      },
    },
  });
}