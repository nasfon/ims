import { apiError, apiSuccess, guardApiUser } from "@/lib/api";
import { mapRecentSaleRow, RECENT_SALES_LIMIT, todayRange } from "@/lib/dashboard";

/**
 * GET /api/v1/dashboard
 * Aggregates the dashboard widgets (PRD §4.10 / API §Dashboard).
 * Counters/credit/low-stock are all-time; sales/expenses/revenue are scoped to
 * the business's local "today". RLS scopes every query to the caller's shop
 * (one shop for Shop Admin/Cashier, all shops for Super Admin).
 */
export async function GET() {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const range = todayRange();

  const [
    totalProducts,
    totalCustomers,
    salesRows,
    creditRows,
    expenseRows,
    lowStock,
    recentRows,
  ] = await Promise.all([
    session.supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    session.supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    session.supabase
      .from("sales")
      .select("total")
      .gte("created_at", range.start)
      .lte("created_at", range.end)
      .neq("status", "reversed"),
    session.supabase
      .from("customers")
      .select("total_credit")
      .is("deleted_at", null),
    session.supabase
      .from("expenses")
      .select("amount")
      .gte("expense_date", range.start)
      .lte("expense_date", range.end),
    session.supabase
      .rpc("low_stock_products", undefined, { count: "exact", head: true })
      .eq("is_active", true),
    session.supabase
      .from("sales")
      .select(
        "id, receipt_number, total, status, created_at, customer:customers(full_name), cashier:users(full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(RECENT_SALES_LIMIT),
  ]);

  const failed = [
    totalProducts.error,
    totalCustomers.error,
    salesRows.error,
    creditRows.error,
    expenseRows.error,
    lowStock.error,
    recentRows.error,
  ].some(Boolean);
  if (failed) {
    return apiError("Unable to load dashboard data.", 500);
  }

  const revenue = (salesRows.data ?? []).reduce(
    (sum, row) => sum + Number(row.total),
    0,
  );
  const outstandingCredit = (creditRows.data ?? []).reduce(
    (sum, row) => sum + Number(row.total_credit),
    0,
  );
  const expenses = (expenseRows.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );

  return apiSuccess(
    {
      total_products: totalProducts.count ?? 0,
      total_customers: totalCustomers.count ?? 0,
      today_sales: salesRows.count ?? 0,
      revenue,
      outstanding_credit: outstandingCredit,
      expenses,
      low_stock: lowStock.count ?? 0,
      recent_sales: (recentRows.data ?? []).map((row) =>
        mapRecentSaleRow(row as Record<string, unknown>),
      ),
    },
    "Dashboard loaded.",
  );
}