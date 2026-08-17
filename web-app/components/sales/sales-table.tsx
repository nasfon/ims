"use client";

import Link from "next/link";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { NewSaleDialog } from "@/components/sales/new-sale-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { useSales } from "@/hooks/use-sales";
import { cn, formatDate, formatNaira } from "@/lib/utils";
import type { Sale } from "@/types/sales";

const PAGE_SIZE = 10;

function useDebouncedValue(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const SORT_FIELDS = [
  { value: "receipt_number", label: "Receipt" },
  { value: "created_at", label: "Date" },
  { value: "payment_method", label: "Payment method" },
  { value: "total", label: "Total" },
  { value: "status", label: "Status" },
] as const;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  pos: "POS",
};

const SALE_STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  corrected: "Corrected",
  reversed: "Reversed",
};



function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

function StatusCell({ status }: { status: Sale["status"] }) {
  return (
    <Badge
      variant={
        status === "reversed"
          ? "destructive"
          : status === "corrected"
            ? "secondary"
            : "default"
      }
    >
      {SALE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
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

export function SalesTable({
  canManage,
  actorShopId,
  shops,
}: {
  canManage: boolean;
  actorShopId: string;
  /** null when the actor is not a Super Admin (no shop selector). */
  shops: { id: string; name: string }[] | null;
}) {
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [sort, setSort] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const search = useDebouncedValue(searchText);

  const { data, isPending, error } = useSales({
    page,
    limit: PAGE_SIZE,
    search,
    sort,
    sortDir,
    status,
    paymentMethod,
  });

  const sales = data?.items ?? [];
  const pagination = data?.pagination;

  function handleSort(field: (typeof SORT_FIELDS)[number]["value"]) {
    if (sort === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:max-w-md sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              placeholder="Search receipt number…"
              className="pl-8"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v ?? "");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-auto">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="corrected">Corrected</SelectItem>
              <SelectItem value="reversed">Reversed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={paymentMethod}
            onValueChange={(v) => {
              setPaymentMethod(v ?? "");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-auto">
              <SelectValue placeholder="All payments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank_transfer">Bank transfer</SelectItem>
              <SelectItem value="pos">POS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canManage ? (
          <NewSaleDialog actorShopId={actorShopId} shops={shops} />
        ) : null}
      </div>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Receipt" field="receipt_number" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Date" field="created_at" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <TableHead>Customer</TableHead>
              <TableHead>Cashier</TableHead>
              <SortableHead label="Payment" field="payment_method" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Total" field="total" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Status" field="status" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <TableHead className="text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  Loading sales…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-destructive">
                  {error.message}
                </TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No sales found.
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.receipt_number}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(sale.created_at)}</TableCell>
                  <TableCell>{sale.customer?.full_name ?? "Walk-in"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {sale.cashier?.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {paymentMethodLabel(sale.payment_method)}
                  </TableCell>
                  <TableCell className="font-medium">{formatNaira(sale.total)}</TableCell>
                  <TableCell>
                    <StatusCell status={sale.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/sales/${sale.id}`}
                      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                      aria-label={`View sale ${sale.receipt_number}`}
                    >
                      <ArrowRight />
                    </Link>
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
            {pagination.total} sales
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