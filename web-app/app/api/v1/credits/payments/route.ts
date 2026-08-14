import type { NextRequest } from "next/server";

import { apiError, apiSuccess, guardApiRole, guardApiUser } from "@/lib/api";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { ROLES } from "@/lib/roles";
import { createServerAdminClient } from "@/lib/supabase/server";
import { UUID_RE, parseCreditPayment } from "@/lib/validation/credit";

const PAGE_LIMIT = 25;
const PAGE_LIMIT_MAX = 100;

type PaymentRow = Record<string, unknown>;

function mapPaymentRow(row: PaymentRow) {
  const customer = row.customer as
    | { full_name: string | null; phone: string | null }
    | undefined;
  return {
    id: row.id as string,
    customer_id: row.customer_id as string,
    customer,
    sale_id: (row.sale_id as string | null) ?? null,
    amount: Number(row.amount),
    payment_method: row.payment_method as string,
    received_by: (row.received_by as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

/** Credit payment history. Admin-only (Credit Payments matrix: Super Admin / Shop Admin CRUD). */
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
  const customerId = searchParams.get("customer_id")?.trim();

  let query = session.supabase
    .from("credit_payments")
    .select("*, customer:customers(full_name, phone)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (customerId) {
    if (!UUID_RE.test(customerId)) return apiError("Invalid customer id.", 400);
    query = query.eq("customer_id", customerId);
  }

  const { data, count, error: dbError } = await query;

  if (dbError) {
    return apiError("Unable to load payment history.", 500);
  }

  return apiSuccess(
    {
      items: (data ?? []).map((row) => mapPaymentRow(row as PaymentRow)),
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    },
    "Payment history loaded.",
  );
}

/**
 * Record a credit payment. The apply_credit_payment trigger enforces the
 * invariants at the DB layer: rejects a payment that exceeds the outstanding
 * balance and debits customers.total_credit by the amount (paying the full
 * balance sets it to zero). The route re-checks the balance for a clean 422
 * and maps the trigger's race-condition error to the same response.
 *
 * The sale itself is not yet validated — the sales table lands in Phase 4
 * (credit_payments.sale_id carries no FK until then); a guard for the sale's
 * remaining_credit is added there.
 */
export async function POST(request: NextRequest) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const { value, errors } = parseCreditPayment(body);
  if (Object.keys(errors).length > 0) {
    return apiError("Validation failed.", 422, errors);
  }

  const admin = createServerAdminClient();

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .select("id, shop_id, total_credit")
    .eq("id", value.customer_id ?? "")
    .is("deleted_at", null)
    .single();

  if (customerError || !customer) return apiError("Customer not found.", 404);

  const actorRole = session.user.role_slug;
  if (actorRole === ROLES.SHOP_ADMIN && customer.shop_id !== session.user.shop_id) {
    return apiError("Customer not found.", 404);
  }

  const amount = value.amount ?? 0;
  const outstanding = Number(customer.total_credit);

  if (amount > outstanding) {
    return apiError("Payment cannot exceed the outstanding balance.", 422);
  }

  const { data: payment, error: insertError } = await admin
    .from("credit_payments")
    .insert({
      customer_id: value.customer_id ?? "",
      sale_id: value.sale_id ?? null,
      amount,
      payment_method: value.payment_method ?? "",
      received_by: session.user.id,
    })
    .select("id, amount")
    .single();

  if (insertError || !payment) {
    // A concurrent payment may have reduced the balance between our read and
    // the insert; the trigger raises payment_exceeds_balance in that case.
    if (insertError?.message?.includes("payment_exceeds_balance")) {
      return apiError("Payment cannot exceed the outstanding balance.", 422);
    }
    return apiError("Unable to record payment.", 500);
  }

  // The trigger already debited customers.total_credit; read it back for the
  // response so the client sees the authoritative new balance.
  const { data: updatedCustomer, error: refreshError } = await admin
    .from("customers")
    .select("total_credit")
    .eq("id", value.customer_id ?? "")
    .single();

  if (refreshError || !updatedCustomer) {
    return apiError("Payment recorded but balance could not be refreshed.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: customer.shop_id,
    action: AUDIT_ACTIONS.CREDIT_PAYMENT_RECORDED,
    entity: "credit_payment",
    entity_id: payment.id,
    ip: getClientIp(request),
  });

  return apiSuccess(
    {
      payment: { id: payment.id, amount: Number(payment.amount) },
      total_credit: Number(updatedCustomer.total_credit),
    },
    "Payment recorded.",
    201,
  );
}