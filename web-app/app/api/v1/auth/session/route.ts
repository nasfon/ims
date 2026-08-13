import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";

/**
 * Returns the current session (profile + auth provider user) or 401 when
 * there is no session. Client components / the session provider use this to
 * restore auth state on mount.
 */
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Not signed in." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Session loaded.",
    data: { user: session.user },
  });
}