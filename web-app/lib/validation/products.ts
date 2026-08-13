export type ParsedValue<T> = { value: T; errors: Record<string, string> };

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NAME_MAX = 100;
const SKU_MAX = 50;
const QUANTITY_MAX = 1_000_000_000;
const MIN_STOCK_MAX = 1_000_000_000;
const PRICE_MAX = 1_000_000_000;

export type ProductCreateInput = {
  shop_id: string | null;
  name: string | null;
  sku: string | null;
  quantity: number | null;
  selling_price: number | null;
  minimum_stock: number | null;
  is_active: boolean | undefined;
};

export type ProductUpdateInput = Partial<
  Omit<ProductCreateInput, "shop_id">
>;

function asTrimmedString(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

function srcObject(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

/**
 * Accepts a JSON number or a numeric string ("1500.00") and returns a finite
 * number, or null when the value is not a number at all.
 */
function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

function parseNonNegativeInt(
  v: unknown,
  max: number,
): { value: number | null; error: string | null } {
  const n = asNumber(v);
  if (n === null) return { value: null, error: "Must be a number." };
  if (!Number.isInteger(n)) return { value: null, error: "Must be a whole number." };
  if (n < 0) return { value: null, error: "Must be zero or greater." };
  if (n > max) return { value: null, error: `Must be ${max} or less.` };
  return { value: n, error: null };
}

function parsePositiveNumber(
  v: unknown,
  max: number,
): { value: number | null; error: string | null } {
  const n = asNumber(v);
  if (n === null) return { value: null, error: "Must be a number." };
  if (n <= 0) return { value: null, error: "Must be greater than zero." };
  if (n > max) return { value: null, error: `Must be ${max} or less.` };
  return { value: n, error: null };
}

function parseBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  return undefined;
}

/** Validates + normalizes a request body for creating a product. */
export function parseProductCreate(body: unknown): ParsedValue<ProductCreateInput> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};

  const shop_id = asTrimmedString(src.shop_id);
  if (!shop_id) errors.shop_id = "shop_id is required.";
  else if (!UUID_RE.test(shop_id)) errors.shop_id = "shop_id must be a valid UUID.";

  const name = asTrimmedString(src.name);
  if (!name) errors.name = "Product name is required.";
  else if (name.length > NAME_MAX) {
    errors.name = `Product name must be ${NAME_MAX} characters or fewer.`;
  }

  const sku = asTrimmedString(src.sku);
  if (!sku) errors.sku = "SKU is required.";
  else if (sku.length > SKU_MAX) errors.sku = `SKU must be ${SKU_MAX} characters or fewer.`;

  let quantity: number | null = null;
  if (src.quantity !== undefined && src.quantity !== null) {
    const qty = parseNonNegativeInt(src.quantity, QUANTITY_MAX);
    if (qty.error) errors.quantity = qty.error;
    else quantity = qty.value;
  }

  const price = parsePositiveNumber(src.selling_price, PRICE_MAX);
  if (price.error) errors.selling_price = price.error;

  let minimumStock: number | null = null;
  if (src.minimum_stock !== undefined && src.minimum_stock !== null) {
    const min = parseNonNegativeInt(src.minimum_stock, MIN_STOCK_MAX);
    if (min.error) errors.minimum_stock = min.error;
    else minimumStock = min.value;
  }

  const is_active = parseBool(src.is_active);
  if (src.is_active != null && is_active === undefined) {
    errors.is_active = "is_active must be a boolean.";
  }

  return {
    value: {
      shop_id,
      name: name ?? "",
      sku: sku ?? "",
      quantity,
      selling_price: price.value,
      minimum_stock: minimumStock,
      is_active,
    },
    errors,
  };
}

/** Validates + normalizes a request body for updating a product. */
export function parseProductUpdate(body: unknown): ParsedValue<ProductUpdateInput> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};
  const value: ProductUpdateInput = {};

  if (src.name !== undefined) {
    const name = asTrimmedString(src.name);
    if (name === null || name.length === 0) errors.name = "Product name cannot be blank.";
    else if (name.length > NAME_MAX) {
      errors.name = `Product name must be ${NAME_MAX} characters or fewer.`;
    } else value.name = name;
  }

  if (src.sku !== undefined) {
    const sku = asTrimmedString(src.sku);
    if (sku === null || sku.length === 0) errors.sku = "SKU cannot be blank.";
    else if (sku.length > SKU_MAX) errors.sku = `SKU must be ${SKU_MAX} characters or fewer.`;
    else value.sku = sku;
  }

  if (src.quantity !== undefined && src.quantity !== null) {
    const qty = parseNonNegativeInt(src.quantity, QUANTITY_MAX);
    if (qty.error) errors.quantity = qty.error;
    else value.quantity = qty.value;
  }
  if (src.quantity === null) errors.quantity = "quantity cannot be null.";

  if (src.selling_price !== undefined && src.selling_price !== null) {
    const price = parsePositiveNumber(src.selling_price, PRICE_MAX);
    if (price.error) errors.selling_price = price.error;
    else value.selling_price = price.value;
  }
  if (src.selling_price === null) errors.selling_price = "selling_price cannot be null.";

  if (src.minimum_stock !== undefined && src.minimum_stock !== null) {
    const min = parseNonNegativeInt(src.minimum_stock, MIN_STOCK_MAX);
    if (min.error) errors.minimum_stock = min.error;
    else value.minimum_stock = min.value;
  }

  if (src.is_active !== undefined) {
    const is_active = parseBool(src.is_active);
    if (is_active === undefined) errors.is_active = "is_active must be a boolean.";
    else value.is_active = is_active;
  }

  return { value, errors };
}