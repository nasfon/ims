export type Shop = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  receipt_footer: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ShopInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logo_url?: string | null;
  receipt_footer?: string | null;
  is_active?: boolean;
};

export type ShopStatus = "active" | "inactive";