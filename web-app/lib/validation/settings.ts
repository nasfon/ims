import type { BusinessSettingsUpdate } from "@/types/settings";

export type ParsedValue<T> = { value: T; errors: Record<string, string> };

const NAME_MAX = 100;
const PHONE_MAX = 50;
const ADDRESS_MAX = 300;
const FOOTER_MAX = 300;
const LOGO_URL_MAX = 500;

function asTrimmedString(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

function srcObject(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

/** Optional field: null means clear, string is trimmed and length-checked. */
function parseOptional(
  v: unknown,
  key: string,
  errors: Record<string, string>,
  max: number,
): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const trimmed = asTrimmedString(v);
  if (trimmed === null) {
    errors[key] = `${key} must be text.`;
    return undefined;
  }
  if (trimmed.length > max) {
    errors[key] = `${key} must be ${max} characters or fewer.`;
    return undefined;
  }
  return trimmed;
}

export function parseBusinessSettingsUpdate(
  body: unknown,
): ParsedValue<BusinessSettingsUpdate> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};
  const value: BusinessSettingsUpdate = {};

  if (src.business_name !== undefined) {
    const name = asTrimmedString(src.business_name);
    if (name === null) {
      errors.business_name = "Business name must be text.";
    } else if (name.length === 0) {
      errors.business_name = "Business name cannot be blank.";
    } else if (name.length > NAME_MAX) {
      errors.business_name = `Business name must be ${NAME_MAX} characters or fewer.`;
    } else {
      value.business_name = name;
    }
  }

  const phone = parseOptional(src.phone, "phone", errors, PHONE_MAX);
  if (phone !== undefined) value.phone = phone;

  const address = parseOptional(src.address, "address", errors, ADDRESS_MAX);
  if (address !== undefined) value.address = address;

  const logoUrl = parseOptional(src.logo_url, "logo_url", errors, LOGO_URL_MAX);
  if (logoUrl !== undefined) value.logo_url = logoUrl;

  const receiptFooter = parseOptional(
    src.receipt_footer,
    "receipt_footer",
    errors,
    FOOTER_MAX,
  );
  if (receiptFooter !== undefined) value.receipt_footer = receiptFooter;

  return { value, errors };
}