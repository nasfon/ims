import { ROLES, isRoleSlug, type RoleSlug } from "@/lib/roles";

export type ParsedValue<T> = { value: T; errors: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 100;
const PASSWORD_MIN = 8;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UserCreateInput = {
  email: string | null;
  /** null → the server generates a temporary password. */
  password: string | null;
  full_name: string | null;
  phone: string | null;
  role_id: string | null;
  role_slug: RoleSlug | null;
  shop_id: string | null;
  is_active: boolean | undefined;
};

export type UserUpdateInput = Partial<UserCreateInput>;

function asTrimmedString(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

function srcObject(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

/** Validates + normalizes a request body for creating a user. */
export function parseUserCreate(body: unknown): ParsedValue<UserCreateInput> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};

  const email = asTrimmedString(src.email);
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  const full_name = asTrimmedString(src.full_name);
  if (!full_name) errors.full_name = "Full name is required.";
  else if (full_name.length > NAME_MAX) {
    errors.full_name = `Full name must be ${NAME_MAX} characters or fewer.`;
  }

  let password: string | null = null;
  if (src.password !== undefined && src.password !== null) {
    if (typeof src.password !== "string") {
      errors.password = "Password must be text.";
    } else if (src.password.length < PASSWORD_MIN) {
      errors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
    } else {
      password = src.password;
    }
  }

  const phone = src.phone == null ? null : asTrimmedString(src.phone);
  if (src.phone != null && phone === null) errors.phone = "Phone must be text.";

  const role_id =
    src.role_id == null ? null : asTrimmedString(src.role_id);
  if (src.role_id != null && role_id === null) errors.role_id = "role_id must be text.";
  else if (role_id && !UUID_RE.test(role_id)) errors.role_id = "role_id must be a valid UUID.";

  let roleSlug: RoleSlug | null = null;
  if (src.role_slug != null) {
    const role_slug = asTrimmedString(src.role_slug);
    if (role_slug === null || role_slug.length === 0) {
      errors.role_slug = "role_slug must be text.";
    } else if (!isRoleSlug(role_slug)) {
      errors.role_slug = "role_slug must be one of super_admin, shop_admin, cashier.";
    } else {
      roleSlug = role_slug;
    }
  }

  if (!role_id && !roleSlug) {
    errors.role = "Provide a role (role_id or role_slug).";
  }

  const shop_id = src.shop_id == null ? null : asTrimmedString(src.shop_id);
  if (src.shop_id != null) {
    if (shop_id === null || shop_id.length === 0) {
      errors.shop_id = "shop_id must be text.";
    } else if (!UUID_RE.test(shop_id)) {
      errors.shop_id = "shop_id must be a valid UUID.";
    }
  }

  let is_active: boolean | undefined;
  if (src.is_active != null) {
    if (typeof src.is_active !== "boolean") {
      errors.is_active = "is_active must be a boolean.";
    } else {
      is_active = src.is_active;
    }
  }

  return {
    value: {
      email,
      password,
      full_name,
      phone,
      role_id,
      role_slug: roleSlug,
      shop_id,
      is_active,
    },
    errors,
  };
}

/** Validates + normalizes a request body for updating a user (all fields optional). */
export function parseUserUpdate(body: unknown): ParsedValue<UserUpdateInput> {
  const src = srcObject(body);
  const errors: Record<string, string> = {};
  const value: UserUpdateInput = {};

  if (src.email !== undefined) {
    const email = asTrimmedString(src.email);
    if (email === null) errors.email = "Email must be text.";
    else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
    else value.email = email;
  }

  if (src.full_name !== undefined) {
    const full_name = asTrimmedString(src.full_name);
    if (full_name === null) errors.full_name = "Full name must be text.";
    else if (full_name.length === 0) errors.full_name = "Full name cannot be blank.";
    else if (full_name.length > NAME_MAX) {
      errors.full_name = `Full name must be ${NAME_MAX} characters or fewer.`;
    } else value.full_name = full_name;
  }

  if (src.phone !== undefined) {
    const phone = src.phone == null ? null : asTrimmedString(src.phone);
    if (src.phone != null && phone === null) errors.phone = "Phone must be text.";
    else value.phone = phone;
  }

  if (src.role_id !== undefined || src.role_slug !== undefined) {
    if (src.role_id !== undefined) {
      const role_id = src.role_id == null ? null : asTrimmedString(src.role_id);
      if (src.role_id != null && (role_id === null || role_id.length === 0)) {
        errors.role_id = "role_id must be text.";
      } else if (role_id && !UUID_RE.test(role_id)) {
        errors.role_id = "role_id must be a valid UUID.";
      } else value.role_id = role_id;
    }
    if (src.role_slug !== undefined) {
      const role_slug = asTrimmedString(src.role_slug);
      if (src.role_slug != null) {
        if (role_slug === null || role_slug.length === 0) {
          errors.role_slug = "role_slug must be text.";
        } else if (!isRoleSlug(role_slug)) {
          errors.role_slug = "role_slug must be one of super_admin, shop_admin, cashier.";
        } else value.role_slug = role_slug as RoleSlug;
      }
    }
  }

  if (src.shop_id !== undefined) {
    const shop_id = src.shop_id == null ? null : asTrimmedString(src.shop_id);
    if (src.shop_id != null) {
      if (shop_id === null || shop_id.length === 0) {
        errors.shop_id = "shop_id must be text.";
      } else if (!UUID_RE.test(shop_id)) {
        errors.shop_id = "shop_id must be a valid UUID.";
      } else value.shop_id = shop_id;
    }
  }

  if (src.is_active !== undefined) {
    if (typeof src.is_active !== "boolean") {
      errors.is_active = "is_active must be a boolean.";
    } else value.is_active = src.is_active;
  }

  return { value, errors };
}

export const USER_ROLE_SLUGS = [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN, ROLES.CASHIER] as const;