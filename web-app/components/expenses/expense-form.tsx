"use client";

import { Loader2, Save } from "lucide-react";
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
  useCreateExpense,
  useUpdateExpense,
  type ApiError,
} from "@/hooks/use-expenses";
import { ROLES, type RoleSlug } from "@/lib/roles";
import type { Expense } from "@/types/expenses";
import type { ShopOption } from "@/types/users";

type Props = {
  mode: "record" | "edit";
  /** Present when editing an existing expense. */
  initial?: Expense;
  actorRole: RoleSlug;
  actorShopId: string;
  /** null when the actor is a Shop Admin (no shop selector). */
  shops: ShopOption[] | null;
  /** Closes the modal after save/cancel. */
  onClose: () => void;
  /** Reports the outcome message back to the list page. */
  onSuccess: (message: string) => void;
};

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

export function ExpenseForm({
  mode,
  initial,
  actorRole,
  actorShopId,
  shops,
  onClose,
  onSuccess,
}: Props) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [expenseDate, setExpenseDate] = useState(
    initial ? toDateInputValue(initial.expense_date) : todayInput(),
  );
  const [formShopId, setFormShopId] = useState(
    actorRole === ROLES.SUPER_ADMIN ? "" : actorShopId,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const create = useCreateExpense();
  const update = useUpdateExpense();

  const busy = create.isPending || update.isPending;

  function applyError(err: ApiError) {
    setFieldErrors(err.errors ?? {});
    setFormError(err.message ?? "Unable to save expense.");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    if (mode === "record" && !formShopId) {
      setFormError("Select a shop.");
      return;
    }
    if (!expenseDate) {
      setFormError("Choose a date.");
      return;
    }

    const done = (message: string) => {
      onSuccess(message);
      onClose();
    };

    if (mode === "edit" && initial) {
      const values: Record<string, unknown> = {};
      if (trimmedDescription !== initial.description) {
        values.description = trimmedDescription;
      }
      if (amountValue !== initial.amount) {
        values.amount = amountValue;
      }
      if (expenseDate !== toDateInputValue(initial.expense_date)) {
        values.expense_date = expenseDate;
      }
      if (Object.keys(values).length === 0) {
        done("No changes to save.");
        return;
      }
      update.mutate(
        { expenseId: initial.id, values },
        {
          onSuccess: () => done("Expense updated."),
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
        onSuccess: () => done("Expense recorded."),
        onError: (err) => applyError(err as ApiError),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "record" ? "Record expense" : "Edit expense"}</CardTitle>
          <CardDescription>
            {mode === "record"
              ? "Record an outgoing business expense."
              : `Update "${initial?.description}".`}
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

          {mode === "record" && shops ? (
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
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save />}
            {busy
              ? "Saving…"
              : mode === "record"
                ? "Record expense"
                : "Save changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}