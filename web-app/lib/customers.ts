import type { CustomerItem, CustomerSortField } from "@/types/customers";

export const CUSTOMER_SORT_FIELDS: readonly CustomerSortField[] = [
  "full_name",
  "phone",
  "total_credit",
  "created_at",
];

export const DEFAULT_CUSTOMER_SORT: CustomerSortField = "full_name";

export type CustomerSort = {
  field: CustomerSortField;
  /** true = ascending (A→Z, low→high), false = descending. */
  ascending: boolean;
};

export const CUSTOMER_FIELDS =
  "id, shop_id, full_name, phone, email, address, total_credit, deleted_at, deleted_by, created_at, updated_at";

/** Raw customer row from the DB (PostgREST returns numeric as a string). */
export type CustomerRow = {
  id: string;
  shop_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  total_credit: string;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
};

/** Maps a DB row to the API shape, coercing numeric columns to numbers. */
export function mapCustomerRow(row: CustomerRow): CustomerItem {
  return {
    ...row,
    total_credit: Number(row.total_credit),
  };
}
