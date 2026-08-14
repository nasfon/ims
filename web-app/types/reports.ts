import type { Expense } from "@/types/expenses";
import type { Sale } from "@/types/sales";

/** Rows returned by the sales/expense report lists. */
export type SalesReportRow = {
  id: string;
  receipt_number: string;
  created_at: string;
  customer_name: string | null;
  cashier_name: string | null;
  payment_method: string;
  subtotal: number;
  discount: number;
  total: number;
  amount_paid: number;
  remaining_credit: number;
  status: Sale["status"];
};

export type SalesSummary = {
  total_sales: number;
  subtotal: number;
  discount: number;
  revenue: number;
  amount_paid: number;
  remaining_credit: number;
};

export type SalesReport = {
  summary: SalesSummary;
  items: SalesReportRow[];
  truncated: boolean;
};

/** One day's revenue aggregation. */
export type RevenueDayRow = {
  date: string;
  sales: number;
  subtotal: number;
  discount: number;
  revenue: number;
  amount_paid: number;
};

export type RevenueReport = {
  summary: SalesSummary;
  items: RevenueDayRow[];
  truncated: boolean;
};

/** Expense row shown by the expenses report. */
export type ExpenseReportRow = Pick<
  Expense,
  "id" | "description" | "amount" | "expense_date"
> & {
  recorded_by_name: string | null;
};

export type ExpensesReport = {
  summary: { count: number; total: number };
  items: ExpenseReportRow[];
  truncated: boolean;
};

/** Customer with outstanding credit. */
export type CreditReportCustomer = {
  id: string;
  full_name: string;
  phone: string;
  total_credit: number;
};

export type CreditReport = {
  summary: {
    total_outstanding: number;
    customers_with_credit: number;
    payments_received: number;
    payments_count: number;
  };
  items: CreditReportCustomer[];
};

export type InventoryReportRow = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  selling_price: number;
  stock_value: number;
  minimum_stock: number;
  is_active: boolean;
};

export type InventoryReport = {
  summary: {
    total_products: number;
    total_units: number;
    low_stock: number;
    stock_value: number;
  };
  items: InventoryReportRow[];
};

/** Shared query params for the report endpoints. */
export type ReportQuery = {
  /** ISO start of the range (inclusive) or null. */
  from: string | null;
  /** ISO end of the range (inclusive) or null. */
  to: string | null;
  /** Super Admin only: scope to one shop. */
  shop_id: string | null;
};