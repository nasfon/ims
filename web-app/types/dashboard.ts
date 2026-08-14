import type { Sale } from "@/types/sales";

export type RecentSale = {
  id: string;
  receipt_number: string;
  total: number;
  status: Sale["status"];
  created_at: string;
  customer: { full_name: string | null } | null;
  cashier: { full_name: string | null } | null;
};

export type DashboardSummary = {
  /** Total active products (excluding soft-deleted). */
  total_products: number;
  /** Total customers (excluding soft-deleted). */
  total_customers: number;
  /** Number of non-reversed sales today. */
  today_sales: number;
  /** Sum of totals for non-reversed sales today. */
  revenue: number;
  /** Outstanding credit across customers. */
  outstanding_credit: number;
  /** Sum of expenses recorded today. */
  expenses: number;
  /** Count of active, non-deleted products at/below minimum stock. */
  low_stock: number;
  /** Most recent sales. */
  recent_sales: RecentSale[];
};