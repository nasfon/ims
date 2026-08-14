export type Expense = {
  id: string;
  shop_id: string;
  description: string;
  amount: number;
  expense_date: string;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  recorder: { full_name: string | null } | null;
};

export type ExpensesResponse = {
  items: Expense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type ExpenseSortField =
  | "description"
  | "amount"
  | "expense_date"
  | "created_at";

export type ExpenseFormValues = {
  description: string;
  amount: number;
  expense_date?: string;
};
