import type { ProductItem, ProductSortField } from "@/types/products";

export const PRODUCT_SORT_FIELDS: readonly ProductSortField[] = [
  "name",
  "sku",
  "quantity",
  "selling_price",
  "minimum_stock",
  "created_at",
];

export const DEFAULT_PRODUCT_SORT: ProductSortField = "name";

export type ProductSort = {
  field: ProductSortField;
  /** true = ascending (A→Z, low→high), false = descending. */
  ascending: boolean;
};

export const PRODUCT_FIELDS =
  "id, shop_id, name, sku, quantity, selling_price, minimum_stock, is_active, deleted_at, deleted_by, created_at, updated_at";

/** Raw product row from the DB (PostgREST returns numeric as a string). */
export type ProductRow = {
  id: string;
  shop_id: string;
  name: string;
  sku: string;
  quantity: number;
  selling_price: string;
  minimum_stock: number;
  is_active: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
};

/** Maps a DB row to the API shape, coercing numeric columns to numbers. */
export function mapProductRow(row: ProductRow): ProductItem {
  return {
    ...row,
    quantity: Number(row.quantity),
    selling_price: Number(row.selling_price),
    minimum_stock: Number(row.minimum_stock),
  };
}
