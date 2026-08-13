import type { RoleSlug } from "@/lib/roles";

/** Row shape returned by the users_with_email view / `/users` API. */
export type UserItem = {
  id: string;
  shop_id: string;
  role_id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  email: string | null;
  role_name: string | null;
  role_slug: RoleSlug | null;
  shop_name: string | null;
};

export type UsersResponse = {
  items: UserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

/** Fields accepted by POST/PATCH `/users`. */
export type UserFormValues = {
  email: string | null;
  password?: string | null;
  full_name: string | null;
  phone?: string | null;
  role_id?: string | null;
  role_slug?: RoleSlug | null;
  shop_id?: string | null;
  is_active?: boolean;
};

export type ShopOption = { id: string; name: string };