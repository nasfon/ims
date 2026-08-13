import type { StockChangeType, StockHistoryItem, StockHistoryRow } from "@/types/stock";

export const STOCK_CHANGE_TYPES: readonly StockChangeType[] = [
  "sale",
  "manual_adjustment",
  "sale_correction",
  "reversal",
];

/** Maps a stock_history_with_details DB row to the API shape. */
export function mapStockHistoryRow(row: StockHistoryRow): StockHistoryItem {
  return {
    ...row,
    quantity_before: Number(row.quantity_before),
    quantity_changed: Number(row.quantity_changed),
    quantity_after: Number(row.quantity_after),
  };
}