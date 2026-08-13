import type { RoleSlug } from "@/lib/roles";

export type AuthSessionUser = {
  id: string;
  email: string | undefined;
  full_name: string;
  is_active: boolean;
  shop_id: string | null;
  role_id: string | null;
  role_slug: RoleSlug | null;
  shop_name: string | null;
};
