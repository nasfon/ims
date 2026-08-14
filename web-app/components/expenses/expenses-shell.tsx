"use client";

import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  useUpdateExpense,
  type ApiError,
} from "@/hooks/use-expenses";
import { ROLES, type RoleSlug } from "@/lib/roles";
import { cn, formatNaira } from "@/lib/utils";
import type { Expense } from "@/types/expenses";
import type { ShopOption } from "@/types/users";

const PAGE_SIZE = 10;

const SORT_FIELDS = [
  { value: "expense_date", label: "Date" },
  { value: "description", label: "Description" },
  { value: "amount", label: "Amount" },
] as const;

type FormState = { mode: "record" } | { mode: "edit"; expense: Expense } | null;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Converts an ISO timestamp to a "YYYY-MM-DD" value for <input type="date">. */
function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

function todayInput(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

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
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayInput());
  const [formShopId, setFormShopId] = useState(
    actorRole === ROLES.SUPER_ADMIN ? "" : actorShopId,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const { mutate: removeExpense, isPending: deleting, variables: deletingId } =
    useDeleteExpense();

  const expenses = data?.items ?? [];
  const pagination = data?.pagination;
  const busy = create.isPending || update.isPending;
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

  function resetFormFields() {
    setDescription("");
    setAmount("");
    setFieldErrors({});
    setFormError(null);
  }

  function openRecord() {
    setSuccess(null);
    resetFormFields();
    setExpenseDate(todayInput());
    setFormShopId(actorRole === ROLES.SUPER_ADMIN ? "" : actorShopId);
    setForm({ mode: "record" });
  }

  function openEdit(expense: Expense) {
    setSuccess(null);
    resetFormFields();
    setExpenseDate(toDateInputValue(expense.expense_date));
    setForm({ mode: "edit", expense });
    setDescription(expense.description);
    setAmount(String(expense.amount));
  }

  function closeForm() {
    setForm(null);
    resetFormFields();
  }

  function applyError(err: ApiError) {
    setFieldErrors(err.errors ?? {});
    setFormError(err.message ?? "Unable to save expense.");
  }

  function handleSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const trimmedDescription = description.trim();
    const amountValue = Number(amount);

    if (!trimmedDescription) {
      setFormError("Description is required.");
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }
    if (form?.mode === "record" && !formShopId) {
      setFormError("Select a shop.");
      return;
    }
    if (!expenseDate) {
      setFormError("Choose a date.");
      return;
    }

    const onSuccess = (message: string) => {
      setSuccess(message);
      closeForm();
    };

    if (form?.mode === "edit") {
      const values: Record<string, unknown> = {};
      if (trimmedDescription !== form.expense.description) {
        values.description = trimmedDescription;
      }
      if (amountValue !== form.expense.amount) {
        values.amount = amountValue;
      }
      if (expenseDate !== toDateInputValue(form.expense.expense_date)) {
        values.expense_date = expenseDate;
      }
      if (Object.keys(values).length === 0) {
        setSuccess("No changes to save.");
        closeForm();
        return;
      }
      update.mutate(
        { expenseId: form.expense.id, values },
        {
          onSuccess: () => onSuccess("Expense updated."),
          onError: (err) => applyError(err as ApiError),
        },
      );
      return;
    }

    create.mutate(
      {
        shop_id: formShopId,
        description: trimmedDescription,
        amount: amountValue,
        expense_date: expenseDate,
      },
      {
        onSuccess: () => onSuccess("Expense recorded."),
        onError: (err) => applyError(err as ApiError),
      },
    );
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

      {form ? (
        <form onSubmit={handleSubmitForm}>
          <Card>
            <CardHeader>
              <CardTitle>
                {form.mode === "record" ? "Record expense" : "Edit expense"}
              </CardTitle>
              <CardDescription>
                {form.mode === "record"
                  ? "Record an outgoing business expense."
                  : `Update "${form.expense.description}".`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Shop rent, electricity, restock transport…"
                  required
                />
                {fieldErrors.description ? (
                  <p className="text-xs text-destructive">{fieldErrors.description}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Amount (₦)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                  {fieldErrors.amount ? (
                    <p className="text-xs text-destructive">{fieldErrors.amount}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    required
                  />
                  {fieldErrors.expense_date ? (
                    <p className="text-xs text-destructive">{fieldErrors.expense_date}</p>
                  ) : null}
                </div>
              </div>

              {form.mode === "record" && shops ? (
                <div className="flex flex-col gap-1.5">
                  <Label>Shop</Label>
                  <Select value={formShopId} onValueChange={(v) => setFormShopId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a shop" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          {shop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.shop_id ? (
                    <p className="text-xs text-destructive">{fieldErrors.shop_id}</p>
                  ) : null}
                </div>
              ) : null}

              {formError ? (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              ) : null}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={busy} onClick={closeForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Save />}
                {busy
                  ? "Saving…"
                  : form.mode === "record"
                    ? "Record expense"
                    : "Save changes"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      ) : null}

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