"use client";

import { CheckCircle2, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { useCreateCreditPayment, useOutstandingCredits } from "@/hooks/use-credit";
import { useCustomer } from "@/hooks/use-customers";
import { cn, formatNaira } from "@/lib/utils";
import type { CustomerItem } from "@/types/customers";

const PAGE_SIZE = 10;

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "pos", label: "POS" },
] as const;

function useDebouncedValue(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

type FormState = {
  customer: CustomerItem;
  /** true when the form was opened from "Mark fully paid". */
  full: boolean;
};

export function CreditBook({ initialCustomerId }: { initialCustomerId?: string }) {
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const search = useDebouncedValue(searchText);

  const [form, setForm] = useState<FormState | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [success, setSuccess] = useState<string | null>(null);

  const { data, isPending, error } = useOutstandingCredits({
    page,
    limit: PAGE_SIZE,
    search,
  });
  const {
    mutate: recordPayment,
    isPending: submitting,
    error: submitError,
    reset: resetSubmitError,
  } = useCreateCreditPayment();
  const initialCustomer = useCustomer(initialCustomerId ?? null);
  const openedInitial = useRef(false);

  // Pre-select the customer when arriving from /customers/{id} (Record payment).
  useEffect(() => {
    if (initialCustomer.data && !openedInitial.current) {
      openedInitial.current = true;
      setSuccess(null);
      resetSubmitError();
      setForm({ customer: initialCustomer.data, full: false });
      setPaymentMethod("cash");
      setAmount("");
    }
  }, [initialCustomer.data, resetSubmitError]);

  const customers = data?.items ?? [];
  const pagination = data?.pagination;
  const outstanding = form ? form.customer.total_credit : 0;

  function openForm(customer: CustomerItem, full: boolean) {
    setSuccess(null);
    resetSubmitError();
    setForm({ customer, full });
    setPaymentMethod("cash");
    setAmount(full ? String(customer.total_credit) : "");
  }

  function closeForm() {
    setForm(null);
    setAmount("");
    setSuccess(null);
    resetSubmitError();
  }

  function submitPayment(fullAmount?: number) {
    if (!form) return;
    resetSubmitError();
    setSuccess(null);

    const value = fullAmount ?? Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }
    if (value > outstanding) {
      return;
    }

    recordPayment(
      {
        customerId: form.customer.id,
        amount: value,
        paymentMethod,
      },
      {
        onSuccess: (res) => {
          const fullyPaid = res.total_credit === 0;
          setSuccess(
            fullyPaid
              ? `${form.customer.full_name} is fully paid off.`
              : `Payment recorded. New balance ${formatNaira(res.total_credit)}.`,
          );
          setForm(null);
          setAmount("");
        },
      },
    );
  }

  const paymentError = submitError?.message;
  const amountInvalid =
    amount !== "" && (!Number.isFinite(Number(amount)) || Number(amount) <= 0);

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
        <Card>
          <CardHeader>
            <CardTitle>
              {form.full ? "Mark fully paid" : "Record payment"}
            </CardTitle>
            <CardDescription>
              {form.customer.full_name} · Outstanding{" "}
              <span className="font-medium text-foreground">
                {formatNaira(outstanding)}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
                  placeholder={form.full ? String(outstanding) : "0.00"}
                  aria-invalid={amountInvalid}
                />
                {amountInvalid ? (
                  <p className="text-xs text-destructive">Enter a valid amount.</p>
                ) : amount !== "" && Number(amount) > outstanding ? (
                  <p className="text-xs text-destructive">
                    Payment cannot exceed the outstanding balance.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Payment method</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v ?? "cash")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {paymentError ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {paymentError}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              {!form.full ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setAmount(String(outstanding))}
                >
                  Pay full balance
                </Button>
              ) : null}
              <Button type="button" variant="ghost" onClick={closeForm} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => submitPayment()}
                disabled={submitting || amountInvalid || amount === ""}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus />}
                {submitting ? "Recording…" : "Record payment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setPage(1);
          }}
          placeholder="Search name or phone…"
          className="pl-8"
        />
      </div>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Outstanding credit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  Loading credit book…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-destructive">
                  {error.message}
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No customers with outstanding credit.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.phone}</TableCell>
                  <TableCell>
                    <span className="font-medium text-destructive">
                      {formatNaira(customer.total_credit)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openForm(customer, false)}
                      >
                        Record payment
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openForm(customer, true)}
                        className={cn("text-emerald-600 hover:text-emerald-600")}
                      >
                        Mark fully paid
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
            {pagination.total} customers with credit
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