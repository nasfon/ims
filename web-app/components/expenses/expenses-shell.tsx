"use client";

import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { ExpenseForm } from "@/components/expenses/expense-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogPopup,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDeleteExpense, useExpenses } from "@/hooks/use-expenses";
import { ROLES, type RoleSlug } from "@/lib/roles";
import { cn, formatDate, formatNaira } from "@/lib/utils";
import type { Expense } from "@/types/expenses";
import type { ShopOption } from "@/types/users";

const PAGE_SIZE = 10;

const SORT_FIELDS = [
  { value: "expense_date", label: "Date" },
  { value: "description", label: "Description" },
  { value: "amount", label: "Amount" },
] as const;

type FormState = { mode: "record" } | { mode: "edit"; expense: Expense } | null;

type SortableHeadProps = {
  label: string;
  field: (typeof SORT_FIELDS)[number]["value"];
  sort: string;
  sortDir: "asc" | "desc";
  onSort: (field: (typeof SORT_FIELDS)[number]["value"]) => void;
};

function SortableHead({ label, field, sort, sortDir, onSort }: SortableHeadProps) {
  const active = sort === field;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 font-medium uppercase hover:text-foreground"
      >
        {label}
        <span className={cn("text-[10px]", active ? "text-foreground" : "text-muted-foreground")}>
          {active ? (sortDir === "asc" ? "▲" : "▼") : "•"}
        </span>
      </button>
    </TableHead>
  );
}

export function ExpensesShell({
  actorRole,
  actorShopId,
  shops,
}: {
  actorRole: RoleSlug;
  actorShopId: string;
  /** null when the actor is a Shop Admin (no shop selector). */
  shops: ShopOption[] | null;
}) {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("expense_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [shopFilter, setShopFilter] = useState(
    actorRole === ROLES.SUPER_ADMIN ? "" : actorShopId,
  );

  const [form, setForm] = useState<FormState>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data, isPending, error } = useExpenses({
    page,
    limit: PAGE_SIZE,
    dateFrom,
    dateTo,
    sort,
    sortDir,
    ...(shops ? { shopId: shopFilter } : {}),
  });
  const { mutate: removeExpense, isPending: deleting, variables: deletingId } =
    useDeleteExpense();

  const expenses = data?.items ?? [];
  const pagination = data?.pagination;
  const isDeleting = (id: string) => deleting && deletingId === id;

  function handleSort(field: (typeof SORT_FIELDS)[number]["value"]) {
    if (sort === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setSortDir("desc");
    }
    setPage(1);
  }

  function openRecord() {
    setSuccess(null);
    setForm({ mode: "record" });
  }

  function openEdit(expense: Expense) {
    setSuccess(null);
    setForm({ mode: "edit", expense });
  }

  function closeForm() {
    setForm(null);
  }

  function handleDelete(expense: Expense) {
    if (
      window.confirm(
        `Delete "${expense.description}" (${formatNaira(expense.amount)})? This cannot be undone.`,
      )
    ) {
      removeExpense(expense.id);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {success ? (
        <div className="flex items-center justify-between rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            {success}
          </span>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <Dialog
        open={form !== null}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
      >
        <DialogBackdrop />
        <DialogPopup className="max-w-lg overflow-y-auto p-0">
          {form ? (
            <ExpenseForm
              mode={form.mode}
              initial={form.mode === "edit" ? form.expense : undefined}
              actorRole={actorRole}
              actorShopId={actorShopId}
              shops={shops}
              onClose={closeForm}
              onSuccess={(message) => setSuccess(message)}
            />
          ) : null}
        </DialogPopup>
      </Dialog>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {shops ? (
            <Select
              value={shopFilter}
              onValueChange={(v) => {
                setShopFilter(v ?? "");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-auto">
                <SelectValue placeholder="All shops" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All shops</SelectItem>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            aria-label="Expenses from"
            className="w-auto"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            aria-label="Expenses to"
            className="w-auto"
          />
        </div>
        <Button type="button" size="sm" onClick={openRecord}>
          <Plus />
          Record expense
        </Button>
      </div>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Date" field="expense_date" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Description" field="description" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Amount" field="amount" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <TableHead>Recorded by</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  Loading expenses…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-destructive">
                  {error.message}
                </TableCell>
              </TableRow>
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No expenses found.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(expense.expense_date)}
                  </TableCell>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell className="font-medium">{formatNaira(expense.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {expense.recorder?.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${expense.description}`}
                        onClick={() => openEdit(expense)}
                        disabled={isDeleting(expense.id)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${expense.description}`}
                        onClick={() => handleDelete(expense)}
                        disabled={isDeleting(expense.id)}
                      >
                        {isDeleting(expense.id) ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing page {pagination.page} of {Math.max(1, pagination.pages)} ·{" "}
            {pagination.total} expenses
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isPending}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.max(1, pagination.pages) || isPending}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}