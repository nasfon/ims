import type { NextRequest } from "next/server";

import {
  apiError,
  apiSuccess,
  guardApiRole,
  guardApiUser,
} from "@/lib/api";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import {
  DEFAULT_EXPENSE_SORT,
  EXPENSE_FIELDS,
  EXPENSE_SORT_FIELDS,
  mapExpenseRow,
  parseDateFilter,
  type ExpenseRow,
} from "@/lib/expenses";
import { getClientIp } from "@/lib/request";
import { ROLES } from "@/lib/roles";
import { createServerAdminClient } from "@/lib/supabase/server";
import { parseExpenseCreate } from "@/lib/validation/expenses";

const PAGE_LIMIT = 25;
const PAGE_LIMIT_MAX = 100;

export async function GET(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    PAGE_LIMIT_MAX,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? String(PAGE_LIMIT), 10) || PAGE_LIMIT),
  );
  // RLS scopes rows to the caller's shop (or all shops for Super Admin).
  const dateFrom = parseDateFilter(searchParams.get("date_from"));
  const dateTo = parseDateFilter(searchParams.get("date_to"));

  const sortRaw = searchParams.get("sort") ?? DEFAULT_EXPENSE_SORT;
  const sortField = EXPENSE_SORT_FIELDS.includes(sortRaw as (typeof EXPENSE_SORT_FIELDS)[number])
    ? (sortRaw as (typeof EXPENSE_SORT_FIELDS)[number])
    : DEFAULT_EXPENSE_SORT;
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const shopId = searchParams.get("shop_id")?.trim();

  let query = session.supabase
    .from("expenses")
    .select("*, recorder:users(full_name)", { count: "exact" })
    .order(sortField, { ascending: sortDir === "asc" })
    .range((page - 1) * limit, page * limit - 1);

  if (dateFrom) query = query.gte("expense_date", dateFrom);
  if (dateTo) query = query.lte("expense_date", dateTo);
  if (shopId && session.user.role_slug === ROLES.SUPER_ADMIN) {
    query = query.eq("shop_id", shopId);
  }

  const { data, count, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load expenses.", 500);
  }

  return apiSuccess(
    {
      items: (data ?? []).map((row) => mapExpenseRow(row as Record<string, unknown>)),
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    },
    "Expenses loaded.",
  );
}

export async function POST(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const { value, errors } = parseExpenseCreate(body);
  if (Object.keys(errors).length > 0) {
    return apiError("Validation failed.", 422, errors);
  }

  const actorRole = session.user.role_slug;

  // Shop Admins operate within their assigned shop only.
  if (actorRole === ROLES.SHOP_ADMIN && value.shop_id !== session.user.shop_id) {
    return apiError("You can only record expenses in your own shop.", 403);
  }

  const insert = {
    shop_id: value.shop_id ?? "",
    description: value.description ?? "",
    amount: value.amount ?? 0,
    ...(value.expense_date ? { expense_date: value.expense_date } : {}),
    recorded_by: session.user.id,
  };

  const admin = createServerAdminClient();
  const { data, error: dbError } = await admin
    .from("expenses")
    .insert(insert)
    .select(`${EXPENSE_FIELDS}, recorder:users(full_name)`)
    .single();

  if (dbError || !data) {
    return apiError("Unable to record expense.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: (data as { shop_id: string }).shop_id,
    action: AUDIT_ACTIONS.EXPENSE_CREATED,
    entity: "expense",
    entity_id: (data as { id: string }).id,
    ip: getClientIp(request),
  });

  return apiSuccess(mapExpenseRow(data as ExpenseRow), "Expense recorded.", 201);
}