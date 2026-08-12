export const ROLES = {
  SUPER_ADMIN: "super_admin",
  SHOP_ADMIN: "shop_admin",
  CASHIER: "cashier",
} as const;

export type RoleSlug = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_NAMES: Record<RoleSlug, string> = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.SHOP_ADMIN]: "Shop Admin",
  [ROLES.CASHIER]: "Cashier",
};

export type Role = {
  id: string;
  name: string;
  slug: RoleSlug;
  created_at: string;
  updated_at: string;
};

export function isRoleSlug(value: string): value is RoleSlug {
  return Object.values(ROLES).includes(value as RoleSlug);
}