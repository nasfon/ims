export type StockChangeType =
  | "sale"
  | "manual_adjustment"
  | "sale_correction"
  | "reversal";

/** Raw stock_history_with_details row from the DB (numerics come back as strings). */
export type StockHistoryRow = {
  id: string;
  shop_id: string;
  product_id: string;
  change_type: StockChangeType;
  quantity_before: string | number;
  quantity_changed: string | number;
  quantity_after: string | number;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
  product_name: string | null;
  product_sku: string | null;
  created_by_name: string | null;
};

export type StockHistoryItem = Omit<
  StockHistoryRow,
  "quantity_before" | "quantity_changed" | "quantity_after"
> & {
  quantity_before: number;
  quantity_changed: number;
  quantity_after: number;
};

export type StockHistoryResponse = {
  items: StockHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};