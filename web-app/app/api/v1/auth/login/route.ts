import { NextResponse, type NextRequest } from "next/server";

import {
  isRateLimited,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
} from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { createClient, createServerAdminClient } from "@/lib/supabase/server";

type LoginBody = {
  email?: string;
  password?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit per client IP (Security & RBAC §9) before paying the cost of a
  // Supabase sign-in attempt.
  if (ip) {
    const { limited, retryAfterSeconds } = isRateLimited(
      `login:${ip}`,
      LOGIN_MAX_ATTEMPTS,
      LOGIN_WINDOW_MS,
    );
    if (limited) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many sign-in attempts. Please try again later.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        },
      );
    }
  }

  const body = (await request.json().catch(() => ({}))) as LoginBody;
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { success: false, message: "Email and password are required." },
      { status: 400 },
    );
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { success: false, message: "Enter a valid email address." },
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

  // Track the last sign-in. Done via the service-role client because RLS only
  // grants cashiers read access to their own profile row.
  await admin
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", user.id);

  await admin.rpc("record_audit", {
    p_user_id: user.id,
    p_shop_id: profile.shop_id,
    p_action: "login",
    p_entity: "user",
    p_entity_id: user.id,
    p_reason: null,
    p_ip_address: ip,
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