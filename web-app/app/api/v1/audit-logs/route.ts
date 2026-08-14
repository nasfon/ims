import type { NextRequest } from "next/server";

import {
  apiError,
  apiSuccess,
  guardApiRole,
  guardApiUser,
} from "@/lib/api";
import { AUDIT_ACTIONS, mapAuditLogRow } from "@/lib/audit";
import { ROLES } from "@/lib/roles";

const PAGE_LIMIT = 25;
const PAGE_LIMIT_MAX = 100;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses a date filter. Date-only values become the start of that day. */
function parseDateFilter(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (DATE_ONLY_RE.test(value)) return `${value}T00:00:00.000Z`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/** Date-only values become the end of that day (inclusive). */
function parseEndOfDay(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (DATE_ONLY_RE.test(value)) return `${value}T23:59:59.999Z`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/**
 * GET /api/v1/audit-logs
 * Lists audit entries with optional filters: user_id, action, date_from,
 * date_to. RLS restricts Shop Admins to their own shop; Super Admins see all.
 */
export async function GET(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    PAGE_LIMIT_MAX,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? String(PAGE_LIMIT), 10) || PAGE_LIMIT),
  );

  const userId = searchParams.get("user_id")?.trim();
  const action = searchParams.get("action")?.trim();
  const dateFrom = parseDateFilter(searchParams.get("date_from"));
  const dateTo = parseEndOfDay(searchParams.get("date_to"));

  if (userId && !UUID_RE.test(userId)) {
    return apiError("user_id must be a valid UUID.", 422);
  }
  if (action && !Object.values(AUDIT_ACTIONS).includes(action as (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS])) {
    return apiError("action is not a recognized audit action.", 422);
  }

  let query = session.supabase
    .from("audit_logs")
    .select("*, user:users(full_name), role:roles(name, slug), shop:shops(name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (userId) {
    query = query.eq("user_id", userId);
  }
  if (action) {
    query = query.eq("action", action);
  }
  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }
  if (dateTo) {
    query = query.lte("created_at", dateTo);
  }

  const { data, count, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load audit logs.", 500);
  }

  return apiSuccess(
    {
      items: (data ?? []).map((row) => mapAuditLogRow(row as Record<string, unknown>)),
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    },
    "Audit logs loaded.",
  );
}