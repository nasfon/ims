import type { BusinessSettings } from "@/types/settings";

export const BUSINESS_SETTINGS_FIELDS = [
  "id",
  "shop_id",
  "business_name",
  "phone",
  "address",
  "logo_url",
  "receipt_footer",
  "created_at",
  "updated_at",
].join(", ");

export const BUSINESS_SETTINGS_SELECT = `${BUSINESS_SETTINGS_FIELDS}, shop:shops(name)`;

type Nested = Record<string, unknown>;

export function mapBusinessSettingsRow(
  row: Nested,
  shopName: string | null,
): BusinessSettings {
  return {
    id: row.id as string,
    shop_id: row.shop_id as string,
    shop_name: shopName,
    business_name: row.business_name as string,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    logo_url: (row.logo_url as string | null) ?? null,
    receipt_footer: (row.receipt_footer as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}