import type { Role, RoleSlug } from "@/lib/roles";

export type User = {
  id: string;
  shop_id: string;
  role_id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
};

export type UserWithRole = User & { role: Pick<Role, "id" | "name" | "slug"> };

export type UserWithRoleSlug = Omit<User, "role_id"> & {
  role_slug: RoleSlug;
  shop_name?: string;
};

export type UserInput = {
  shop_id: string;
  role_id: string;
  full_name: string;
  phone?: string | null;
  is_active?: boolean;
};