export type ParsedValue<T> = { value: T; errors: Record<string, string> };

const AMOUNT_MAX = 1_000_000_000;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PAYMENT_METHODS = ["cash", "bank_transfer", "pos"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(v: string): v is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(v);
}

export type CreditPaymentInput = {
  customer_id: string | null;
  sale_id: string | null;
  amount: number | null;
  payment_method: string | null;
};

function asTrimmedString(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

function srcObject(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

/**
 * Validates + normalizes a request body for recording a credit payment.
 * The outstanding-balance check happens in the route/service (needs the
 * customer's current total_credit).
 */
export function parseCreditPayment(body: unknown): ParsedValue<CreditPaymentInput> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};

  const customer_id = asTrimmedString(src.customerId);
  if (!customer_id) errors.customerId = "customerId is required.";
  else if (!UUID_RE.test(customer_id)) errors.customerId = "customerId must be a valid UUID.";

  // Optional: settles a specific sale's credit once the Phase 4 sales table
  // exists. Omitted payments debit the customer's overall balance.
  let sale_id: string | null = null;
  if (src.saleId != null) {
    const trimmed = asTrimmedString(src.saleId);
    if (trimmed === null) errors.saleId = "saleId must be text.";
    else if (trimmed && !UUID_RE.test(trimmed)) {
      errors.saleId = "saleId must be a valid UUID.";
    } else {
      sale_id = trimmed || null;
    }
  }

  let amount: number | null = null;
  const parsed = asNumber(src.amount);
  if (parsed === null) errors.amount = "amount must be a number.";
  else if (parsed <= 0) errors.amount = "amount must be greater than zero.";
  else if (parsed > AMOUNT_MAX) errors.amount = `amount must be ${AMOUNT_MAX} or less.`;
  else amount = parsed;

  let payment_method: string | null = null;
  const method = asTrimmedString(src.paymentMethod);
  if (!method) errors.paymentMethod = "paymentMethod is required.";
  else if (!isPaymentMethod(method)) {
    errors.paymentMethod = "paymentMethod must be one of cash, bank_transfer, pos.";
  } else payment_method = method;

  return { value: { customer_id, sale_id, amount, payment_method }, errors };
}