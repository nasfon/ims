import type {
  SaleCorrectValues,
  SaleFormValues,
  SaleLineInput,
  SaleReasonValue,
} from "@/types/sales";

export type ParsedValue<T> = { value: T; errors: Record<string, string> };

const AMOUNT_MAX = 1_000_000_000;
const QUANTITY_MAX = 1_000_000;
const ITEMS_MAX = 100;
const REASON_MAX = 500;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PAYMENT_METHODS = ["cash", "bank_transfer", "pos"] as const;

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

type ParsedSaleFields = {
  errors: Record<string, string>;
  discount: number;
  amount_paid: number;
  payment_method: string;
};

/** Shared line-items parser (`items[i].productId` / `items[i].quantity`). */
function parseItems(src: Record<string, unknown>, errors: Record<string, string>): SaleLineInput[] {
  const items: SaleLineInput[] = [];
  if (!Array.isArray(src.items)) {
    errors.items = "items must be an array.";
  } else if (src.items.length === 0) {
    errors.items = "Add at least one item.";
  } else if (src.items.length > ITEMS_MAX) {
    errors.items = `A sale can have at most ${ITEMS_MAX} line items.`;
  } else {
    const seen = new Set<string>();
    src.items.forEach((raw, i) => {
      const key = `items[${i}]`;
      const line = srcObject(raw);
      const product_id = asTrimmedString(line.productId);
      const quantity = asNumber(line.quantity);

      if (!product_id) {
        errors[`${key}.productId`] = "productId is required.";
      } else if (!UUID_RE.test(product_id)) {
        errors[`${key}.productId`] = "productId must be a valid UUID.";
      } else if (seen.has(product_id)) {
        errors[`${key}.productId`] = "Each product can only appear once.";
      } else {
        seen.add(product_id);
      }

      if (quantity === null) {
        errors[`${key}.quantity`] = "quantity must be a number.";
      } else if (!Number.isInteger(quantity) || quantity <= 0) {
        errors[`${key}.quantity`] = "quantity must be a whole number greater than zero.";
      } else if (quantity > QUANTITY_MAX) {
        errors[`${key}.quantity`] = `quantity must be ${QUANTITY_MAX} or less.`;
      }

      if (product_id && quantity !== null && quantity > 0) {
        items.push({ product_id, quantity });
      }
    });
  }
  return items;
}

/** Shared discount/amount_paid/payment_method parser. */
function parseSaleFields(src: Record<string, unknown>, errors: Record<string, string>): ParsedSaleFields {
  let discount: number | null = null;
  if (src.discount !== undefined && src.discount !== null) {
    const d = asNumber(src.discount);
    if (d === null) errors.discount = "discount must be a number.";
    else if (d < 0) errors.discount = "discount cannot be negative.";
    else if (d > AMOUNT_MAX) errors.discount = `discount must be ${AMOUNT_MAX} or less.`;
    else discount = d;
  }

  let amount_paid: number | null = null;
  if (src.amount_paid !== undefined && src.amount_paid !== null) {
    const p = asNumber(src.amount_paid);
    if (p === null) errors.amount_paid = "amount_paid must be a number.";
    else if (p < 0) errors.amount_paid = "amount_paid cannot be negative.";
    else if (p > AMOUNT_MAX) errors.amount_paid = `amount_paid must be ${AMOUNT_MAX} or less.`;
    else amount_paid = p;
  }

  const payment_method = asTrimmedString(src.payment_method);
  if (!payment_method) errors.payment_method = "payment_method is required.";
  else if (!(PAYMENT_METHODS as readonly string[]).includes(payment_method)) {
    errors.payment_method = "payment_method must be one of cash, bank_transfer, pos.";
  }

  return { errors, discount: discount ?? 0, amount_paid: amount_paid ?? 0, payment_method: payment_method ?? "" };
}

function parseReason(src: Record<string, unknown>, errors: Record<string, string>): string {
  const reason = asTrimmedString(src.reason);
  if (!reason) errors.reason = "reason is required.";
  else if (reason.length > REASON_MAX) errors.reason = `reason must be ${REASON_MAX} characters or less.`;
  return reason ?? "";
}

/**
 * Validates + normalizes a request body for creating a sale.
 * Totals are computed server-side from the products' current prices; the
 * remaining-credit / amount-paid vs total checks happen in create_sale.
 */
export function parseSaleCreate(body: unknown): ParsedValue<SaleFormValues> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};

  let shop_id: string | null = null;
  if (src.shop_id != null) {
    const trimmed = asTrimmedString(src.shop_id);
    if (trimmed === null) errors.shop_id = "shop_id must be text.";
    else if (trimmed && !UUID_RE.test(trimmed)) errors.shop_id = "shop_id must be a valid UUID.";
    else shop_id = trimmed || null;
  }

  let customer_id: string | null = null;
  if (src.customer_id != null) {
    const trimmed = asTrimmedString(src.customer_id);
    if (trimmed === null) errors.customer_id = "customer_id must be text.";
    else if (trimmed && !UUID_RE.test(trimmed)) {
      errors.customer_id = "customer_id must be a valid UUID.";
    } else customer_id = trimmed || null;
  }

  const fields = parseSaleFields(src, errors);
  const items = parseItems(src, errors);

  return {
    value: {
      shop_id: shop_id ?? undefined,
      customer_id: customer_id ?? undefined,
      discount: fields.discount,
      payment_method: fields.payment_method,
      amount_paid: fields.amount_paid,
      items,
    },
    errors,
  };
}

/**
 * Validates + normalizes a request body for correcting a sale.
 * The customer is not changeable on correction; items/payment/discount/amount
 * are revalidated and the reason is mandatory.
 */
export function parseSaleCorrect(body: unknown): ParsedValue<SaleCorrectValues> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};

  const reason = parseReason(src, errors);
  const fields = parseSaleFields(src, errors);
  const items = parseItems(src, errors);

  return {
    value: {
      reason,
      discount: fields.discount,
      payment_method: fields.payment_method,
      amount_paid: fields.amount_paid,
      items,
    },
    errors,
  };
}

/** Validates + normalizes a request body for reversing a sale (reason only). */
export function parseSaleReverse(body: unknown): ParsedValue<SaleReasonValue> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};
  const reason = parseReason(src, errors);

  return { value: { reason }, errors };
}