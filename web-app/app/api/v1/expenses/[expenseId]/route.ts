import type { NextRequest } from "next/server";

import {
  apiError,
  apiSuccess,
  guardApiRole,
  guardApiUser,
} from "@/lib/api";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import {
  EXPENSE_FIELDS,
  mapExpenseRow,
  type ExpenseRow,
} from "@/lib/expenses";
import { getClientIp } from "@/lib/request";
import { ROLES } from "@/lib/roles";
import { createServerAdminClient } from "@/lib/supabase/server";
import {
  UUID_RE,
  parseExpenseUpdate,
} from "@/lib/validation/expenses";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const { expenseId } = await params;
  if (!UUID_RE.test(expenseId)) return apiError("Invalid expense id.", 400);

  const { data: expense, error: dbError } = await session.supabase
    .from("expenses")
    .select(`${EXPENSE_FIELDS}, recorder:users(full_name)`)
    .eq("id", expenseId)
    .single();

  if (dbError || !expense) {
    return apiError("Expense not found.", 404);
  }

  return apiSuccess(mapExpenseRow(expense as ExpenseRow), "Expense loaded.");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const { expenseId } = await params;
  if (!UUID_RE.test(expenseId)) return apiError("Invalid expense id.", 400);

  const body = await request.json().catch(() => ({}));
  const { value, errors } = parseExpenseUpdate(body);
  if (Object.keys(errors).length > 0) {
    return apiError("Validation failed.", 422, errors);
  }
  if (Object.keys(value).length === 0) {
    return apiError("No fields to update.", 400);
  }

  const admin = createServerAdminClient();

  const { data: target, error: targetError } = await admin
    .from("expenses")
    .select("id, shop_id")
    .eq("id", expenseId)
    .single();

  if (targetError || !target) return apiError("Expense not found.", 404);

  const actorRole = session.user.role_slug;
  if (actorRole === ROLES.SHOP_ADMIN && target.shop_id !== session.user.shop_id) {
    return apiError("Expense not found.", 404);
  }

  const { data, error: dbError } = await admin
    .from("expenses")
    .update(value)
    .eq("id", expenseId)
    .select(`${EXPENSE_FIELDS}, recorder:users(full_name)`)
    .single();

  if (dbError || !data) {
    return apiError("Unable to update expense.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: target.shop_id,
    action: AUDIT_ACTIONS.EXPENSE_UPDATED,
    entity: "expense",
    entity_id: expenseId,
    ip: getClientIp(request),
  });

  return apiSuccess(mapExpenseRow(data as ExpenseRow), "Expense updated.");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const { expenseId } = await params;
  if (!UUID_RE.test(expenseId)) return apiError("Invalid expense id.", 400);

  const admin = createServerAdminClient();

  const { data: target, error: targetError } = await admin
    .from("expenses")
    .select("id, shop_id")
    .eq("id", expenseId)
    .single();

  if (targetError || !target) return apiError("Expense not found.", 404);

  const actorRole = session.user.role_slug;
  if (actorRole === ROLES.SHOP_ADMIN && target.shop_id !== session.user.shop_id) {
    return apiError("Expense not found.", 404);
  }

  const { error: dbError } = await admin
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (dbError) {
    return apiError("Unable to delete expense.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: target.shop_id,
    action: AUDIT_ACTIONS.EXPENSE_DELETED,
    entity: "expense",
    entity_id: expenseId,
    ip: getClientIp(request),
  });

  return apiSuccess({ id: expenseId }, "Expense deleted.");
}