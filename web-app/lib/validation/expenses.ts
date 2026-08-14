import type { ExpenseFormValues } from "@/types/expenses";

export type ParsedValue<T> = { value: T; errors: Record<string, string> };

const DESCRIPTION_MAX = 300;
const AMOUNT_MAX = 1_000_000_000;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 * Accepts a date-only string ("2026-08-07") or a full ISO timestamp and
 * normalizes it to an ISO string; returns null when not a valid date.
 */
function asExpenseDate(v: unknown): string | null {
  const trimmed = asTrimmedString(v);
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

export type ExpenseCreateInput = {
  shop_id: string | null;
  description: string | null;
  amount: number | null;
  expense_date: string | null;
};

/** Validates + normalizes a request body for creating an expense. */
export function parseExpenseCreate(body: unknown): ParsedValue<ExpenseCreateInput> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};

  const shop_id = asTrimmedString(src.shop_id);
  if (!shop_id) errors.shop_id = "shop_id is required.";
  else if (!UUID_RE.test(shop_id)) errors.shop_id = "shop_id must be a valid UUID.";

  const description = asTrimmedString(src.description);
  if (!description) errors.description = "Description is required.";
  else if (description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }

  let amount: number | null = null;
  if (src.amount !== undefined && src.amount !== null) {
    const a = asNumber(src.amount);
    if (a === null) errors.amount = "amount must be a number.";
    else if (a <= 0) errors.amount = "amount must be greater than zero.";
    else if (a > AMOUNT_MAX) errors.amount = `amount must be ${AMOUNT_MAX} or less.`;
    else amount = a;
  }

  let expense_date: string | null = null;
  if (src.expense_date !== undefined && src.expense_date !== null) {
    const date = asExpenseDate(src.expense_date);
    if (date === null) errors.expense_date = "expense_date must be a valid date.";
    else expense_date = date;
  }

  return {
    value: {
      shop_id,
      description: description ?? "",
      amount,
      expense_date,
    },
    errors,
  };
}

/** Validates + normalizes a request body for updating an expense. */
export function parseExpenseUpdate(body: unknown): ParsedValue<Partial<ExpenseFormValues>> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};
  const value: Partial<ExpenseFormValues> = {};

  if (src.description !== undefined) {
    const description = asTrimmedString(src.description);
    if (description === null || description.length === 0) {
      errors.description = "Description cannot be blank.";
    } else if (description.length > DESCRIPTION_MAX) {
      errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
    } else value.description = description;
  }

  if (src.amount !== undefined && src.amount !== null) {
    const a = asNumber(src.amount);
    if (a === null) errors.amount = "amount must be a number.";
    else if (a <= 0) errors.amount = "amount must be greater than zero.";
    else if (a > AMOUNT_MAX) errors.amount = `amount must be ${AMOUNT_MAX} or less.`;
    else value.amount = a;
  }
  if (src.amount === null) errors.amount = "amount cannot be null.";

  if (src.expense_date !== undefined) {
    if (src.expense_date === null) {
      errors.expense_date = "expense_date cannot be null.";
    } else {
      const date = asExpenseDate(src.expense_date);
      if (date === null) errors.expense_date = "expense_date must be a valid date.";
      else value.expense_date = date;
    }
  }

  return { value, errors };
}