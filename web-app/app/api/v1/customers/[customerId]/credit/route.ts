import type { NextRequest } from "next/server";

import { apiError, apiSuccess, guardApiUser } from "@/lib/api";
import {
  CUSTOMER_FIELDS,
  mapCustomerRow,
  type CustomerRow,
} from "@/lib/customers";
import { UUID_RE } from "@/lib/validation/customers";

const PAGE_LIMIT = 25;
const PAGE_LIMIT_MAX = 100;

/**
 * Credit summary + payment history for a customer.
 *
 * Outstanding balance is maintained on the customer row (`total_credit`).
 * Credit Payments RLS (Security §5) lets Super Admin and Shop Admin see
 * payment history; Cashier rows resolve to none.
 */
type CreditPaymentRow = Record<string, unknown>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const { customerId } = await params;
  if (!UUID_RE.test(customerId)) return apiError("Invalid customer id.", 400);

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    PAGE_LIMIT_MAX,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? String(PAGE_LIMIT), 10) || PAGE_LIMIT),
  );

  const { data: customer, error: customerError } = await session.supabase
    .from("customers")
    .select(CUSTOMER_FIELDS)
    .eq("id", customerId)
    .is("deleted_at", null)
    .single();

  if (customerError || !customer) {
    return apiError("Customer not found.", 404);
  }

  // Total paid = sum of all payments. Separate from the paginated list below
  // so the summary is always accurate regardless of page size.
  const { data: allPayments, error: sumError } = await session.supabase
    .from("credit_payments")
    .select("amount")
    .eq("customer_id", customerId);

  if (sumError) {
    return apiError("Unable to load credit summary.", 500);
  }

  const outstanding = Number((customer as CustomerRow).total_credit);
  const totalPaid = (allPayments ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );

  const { data: payments, count, error: listError } = await session.supabase
    .from("credit_payments")
    .select("*", { count: "exact" })
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (listError) {
    return apiError("Unable to load payment history.", 500);
  }

  const mapPayment = (row: CreditPaymentRow) => ({
    id: row.id as string,
    sale_id: (row.sale_id as string | null) ?? null,
    amount: Number(row.amount),
    payment_method: row.payment_method as string,
    received_by: (row.received_by as string | null) ?? null,
    created_at: row.created_at as string,
  });

  return apiSuccess(
    {
      customer: mapCustomerRow(customer as CustomerRow),
      summary: {
        outstanding,
        total_paid: totalPaid,
        // Credit granted is what is still owed plus what has been paid off.
        total_purchased_on_credit: outstanding + totalPaid,
      },
      payments: {
        items: (payments ?? []).map(mapPayment),
        pagination: {
          page,
          limit,
          total: count ?? 0,
          pages: Math.ceil((count ?? 0) / limit),
        },
      },
    },
    "Customer credit loaded.",
  );
}