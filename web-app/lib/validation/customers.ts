export type ParsedValue<T> = { value: T; errors: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NAME_MAX = 100;
const PHONE_MAX = 30;
const EMAIL_MAX = 100;
const ADDRESS_MAX = 500;

/**
 * total_credit is intentionally not part of create/update: it is derived from
 * sales and credit payments, never edited by hand.
 */
export type CustomerCreateInput = {
  shop_id: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type CustomerUpdateInput = Partial<CustomerCreateInput>;

function asTrimmedString(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

function srcObject(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

/** Validates + normalizes a request body for creating a customer. */
export function parseCustomerCreate(body: unknown): ParsedValue<CustomerCreateInput> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};

  const shop_id = asTrimmedString(src.shop_id);
  if (!shop_id) errors.shop_id = "shop_id is required.";
  else if (!UUID_RE.test(shop_id)) errors.shop_id = "shop_id must be a valid UUID.";

  const full_name = asTrimmedString(src.full_name);
  if (!full_name) errors.full_name = "Full name is required.";
  else if (full_name.length > NAME_MAX) {
    errors.full_name = `Full name must be ${NAME_MAX} characters or fewer.`;
  }

  const phone = asTrimmedString(src.phone);
  if (!phone) errors.phone = "Phone is required.";
  else if (phone.length > PHONE_MAX) {
    errors.phone = `Phone must be ${PHONE_MAX} characters or fewer.`;
  }

  let email: string | null = null;
  if (src.email != null) {
    const trimmed = asTrimmedString(src.email);
    if (trimmed === null) errors.email = "Email must be text.";
    else if (trimmed.length > EMAIL_MAX) {
      errors.email = `Email must be ${EMAIL_MAX} characters or fewer.`;
    } else if (trimmed && !EMAIL_RE.test(trimmed)) {
      errors.email = "Enter a valid email address.";
    } else {
      email = trimmed || null;
    }
  }

  let address: string | null = null;
  if (src.address != null) {
    const trimmed = asTrimmedString(src.address);
    if (trimmed === null) errors.address = "Address must be text.";
    else if (trimmed.length > ADDRESS_MAX) {
      errors.address = `Address must be ${ADDRESS_MAX} characters or fewer.`;
    } else {
      address = trimmed || null;
    }
  }

  return {
    value: {
      shop_id,
      full_name: full_name ?? "",
      phone: phone ?? "",
      email,
      address,
    },
    errors,
  };
}

/** Validates + normalizes a request body for updating a customer. */
export function parseCustomerUpdate(body: unknown): ParsedValue<CustomerUpdateInput> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};
  const value: CustomerUpdateInput = {};

  if (src.full_name !== undefined) {
    const full_name = asTrimmedString(src.full_name);
    if (full_name === null) errors.full_name = "Full name must be text.";
    else if (full_name.length === 0) errors.full_name = "Full name cannot be blank.";
    else if (full_name.length > NAME_MAX) {
      errors.full_name = `Full name must be ${NAME_MAX} characters or fewer.`;
    } else value.full_name = full_name;
  }

  if (src.phone !== undefined) {
    const phone = asTrimmedString(src.phone);
    if (phone === null) errors.phone = "Phone must be text.";
    else if (phone.length === 0) errors.phone = "Phone cannot be blank.";
    else if (phone.length > PHONE_MAX) {
      errors.phone = `Phone must be ${PHONE_MAX} characters or fewer.`;
    } else value.phone = phone;
  }

  if (src.email !== undefined) {
    if (src.email == null) {
      value.email = null;
    } else {
      const email = asTrimmedString(src.email);
      if (email === null) errors.email = "Email must be text.";
      else if (email && email.length > EMAIL_MAX) {
        errors.email = `Email must be ${EMAIL_MAX} characters or fewer.`;
      } else if (email && !EMAIL_RE.test(email)) {
        errors.email = "Enter a valid email address.";
      } else {
        value.email = email || null;
      }
    }
  }

  if (src.address !== undefined) {
    if (src.address == null) {
      value.address = null;
    } else {
      const address = asTrimmedString(src.address);
      if (address === null) errors.address = "Address must be text.";
      else if (address && address.length > ADDRESS_MAX) {
        errors.address = `Address must be ${ADDRESS_MAX} characters or fewer.`;
      } else {
        value.address = address || null;
      }
    }
  }

  return { value, errors };
}