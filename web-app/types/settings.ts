export type BusinessSettings = {
  id: string;
  shop_id: string;
  shop_name: string | null;
  business_name: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  receipt_footer: string | null;
  created_at: string;
  updated_at: string;
};

/** Fields accepted by PATCH /settings/business (all optional). */
export type BusinessSettingsUpdate = {
  business_name?: string;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
  receipt_footer?: string | null;
};