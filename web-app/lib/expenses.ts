import type { Expense, ExpenseSortField } from "@/types/expenses";

export const EXPENSE_SORT_FIELDS: readonly ExpenseSortField[] = [
  "description",
  "amount",
  "expense_date",
  "created_at",
];

export const DEFAULT_EXPENSE_SORT: ExpenseSortField = "expense_date";

export const EXPENSE_FIELDS =
  "id, shop_id, description, amount, expense_date, recorded_by, created_at, updated_at";

/** Raw expense row from the DB (PostgREST returns numeric as a string). */
export type ExpenseRow = {
  id: string;
  shop_id: string;
  description: string;
  amount: string;
  expense_date: string;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

type Nested = Record<string, unknown>;

/** Maps a DB row to the API shape, coercing numerics and optional embeds. */
export function mapExpenseRow(row: Nested): Expense {
  const recorder = row.recorder as Nested | null | undefined;
  return {
    id: row.id as string,
    shop_id: row.shop_id as string,
    description: row.description as string,
    amount: Number(row.amount),
    expense_date: row.expense_date as string,
    recorded_by: (row.recorded_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    recorder: recorder
      ? { full_name: (recorder.full_name as string | null) ?? null }
      : null,
  };
}

/**
 * Parses a ?date_from / ?date_to filter into an ISO timestamp (start of the
 * given day for date-only input), or null when absent/invalid.
 */
export function parseDateFilter(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnly.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}