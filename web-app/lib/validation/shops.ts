import type { ShopInput } from "@/lib/shops";

export type ParsedValue<T> = { value: T; errors: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEXT_MAX = 100;

function asTrimmedString(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

function srcObject(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

/** Validates + normalizes a request body for creating a shop. */
export function parseShopCreate(body: unknown): ParsedValue<ShopInput> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};

  const name = asTrimmedString(src.name);
  if (!name) errors.name = "Shop name is required.";
  else if (name.length > TEXT_MAX) {
    errors.name = `Shop name must be ${TEXT_MAX} characters or fewer.`;
  }

  const phone = src.phone == null ? null : asTrimmedString(src.phone);
  if (src.phone != null && phone === null) errors.phone = "Phone must be text.";

  const email = src.email == null ? null : asTrimmedString(src.email);
  if (src.email != null && email === null) errors.email = "Email must be text.";
  else if (email && !EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  const address = src.address == null ? null : asTrimmedString(src.address);
  if (src.address != null && address === null) errors.address = "Address must be text.";

  const logoUrl = src.logo_url == null ? null : asTrimmedString(src.logo_url);
  if (src.logo_url != null && logoUrl === null) errors.logo_url = "Logo URL must be text.";

  const receiptFooter =
    src.receipt_footer == null ? null : asTrimmedString(src.receipt_footer);
  if (src.receipt_footer != null && receiptFooter === null) {
    errors.receipt_footer = "Receipt footer must be text.";
  }

  let isActive: boolean | undefined;
  if (src.is_active != null) {
    if (typeof src.is_active !== "boolean") {
      errors.is_active = "is_active must be a boolean.";
    } else {
      isActive = src.is_active;
    }
  }

  return {
    value: {
      name: name ?? "",
      phone,
      email,
      address,
      logo_url: logoUrl,
      receipt_footer: receiptFooter,
      is_active: isActive,
    },
    errors,
  };
}

/** Validates + normalizes a request body for updating a shop (all fields optional). */
export function parseShopUpdate(body: unknown): ParsedValue<Partial<ShopInput>> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};
  const value: Partial<ShopInput> = {};

  if (src.name !== undefined) {
    const name = asTrimmedString(src.name);
    if (name === null) errors.name = "Name must be text.";
    else if (name.length === 0) errors.name = "Shop name cannot be blank.";
    else if (name.length > TEXT_MAX) {
      errors.name = `Shop name must be ${TEXT_MAX} characters or fewer.`;
    } else {
      value.name = name;
    }
  }

  if (src.phone !== undefined) {
    const phone = src.phone == null ? null : asTrimmedString(src.phone);
    if (src.phone != null && phone === null) {
      errors.phone = "Phone must be text.";
    } else {
      value.phone = phone;
    }
  }

  if (src.email !== undefined) {
    const email = src.email == null ? null : asTrimmedString(src.email);
    if (src.email != null && email === null) {
      errors.email = "Email must be text.";
    } else if (email && !EMAIL_RE.test(email)) {
      errors.email = "Enter a valid email address.";
    } else {
      value.email = email;
    }
  }

  if (src.address !== undefined) {
    const address = src.address == null ? null : asTrimmedString(src.address);
    if (src.address != null && address === null) {
      errors.address = "Address must be text.";
    } else {
      value.address = address;
    }
  }

  if (src.logo_url !== undefined) {
    const logoUrl = src.logo_url == null ? null : asTrimmedString(src.logo_url);
    if (src.logo_url != null && logoUrl === null) {
      errors.logo_url = "Logo URL must be text.";
    } else {
      value.logo_url = logoUrl;
    }
  }

  if (src.receipt_footer !== undefined) {
    const receiptFooter =
      src.receipt_footer == null ? null : asTrimmedString(src.receipt_footer);
    if (src.receipt_footer != null && receiptFooter === null) {
      errors.receipt_footer = "Receipt footer must be text.";
    } else {
      value.receipt_footer = receiptFooter;
    }
  }

  if (src.is_active !== undefined) {
    if (typeof src.is_active !== "boolean") {
      errors.is_active = "is_active must be a boolean.";
    } else {
      value.is_active = src.is_active;
    }
  }

  return { value, errors };
}