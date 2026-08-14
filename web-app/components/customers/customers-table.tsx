"use client";

import Link from "next/link";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustomers, useDeleteCustomer } from "@/hooks/use-customers";
import { cn, formatNaira } from "@/lib/utils";
import type { CustomerItem } from "@/types/customers";

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
  { value: "full_name", label: "Name" },
  { value: "phone", label: "Phone" },
  { value: "total_credit", label: "Outstanding credit" },
  { value: "created_at", label: "Created" },
] as const;

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

function CreditCell({ totalCredit }: { totalCredit: number }) {
  const owing = totalCredit > 0;
  return (
    <span className={cn(owing && "font-medium text-destructive")}>
      {formatNaira(totalCredit)}
    </span>
  );
}

export function CustomersTable({ canManage }: { canManage: boolean }) {
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const search = useDebouncedValue(searchText);

  const { data, isPending, error } = useCustomers({
    page,
    limit: PAGE_SIZE,
    search,
    sort,
    sortDir,
  });
  const {
    mutate: removeCustomer,
    isPending: deleting,
    variables: deletingId,
    error: deleteError,
    reset: resetDeleteError,
  } = useDeleteCustomer();

  const customers = data?.items ?? [];
  const pagination = data?.pagination;

  const isDeleting = (id: string) => deleting && deletingId === id;

  function handleSort(field: (typeof SORT_FIELDS)[number]["value"]) {
    if (sort === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function handleDelete(customer: CustomerItem) {
    if (
      window.confirm(
        `Delete "${customer.full_name}"? Their history stays intact, but they will no longer appear in the customer list.`,
      )
    ) {
      resetDeleteError();
      removeCustomer(customer.id);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
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
        {canManage ? (
          <Link href="/customers/new" className={buttonVariants({ size: "sm" })}>
            <Plus />
            Add customer
          </Link>
        ) : null}
      </div>

      {deleteError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {deleteError.message}
        </div>
      ) : null}

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Name" field="full_name" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Phone" field="phone" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Outstanding credit" field="total_credit" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <TableHead>Total purchases</TableHead>
              {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 5 : 4}
                  className="h-24 text-center text-muted-foreground"
                >
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  Loading customers…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 5 : 4}
                  className="h-24 text-center text-destructive"
                >
                  {error.message}
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 5 : 4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.phone}</TableCell>
                  <TableCell>
                    <CreditCell totalCredit={customer.total_credit} />
                  </TableCell>
                  {/* Total purchases: populated once the Phase 4 sales table exists. */}
                  <TableCell className="text-muted-foreground">—</TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Link
                          href={`/customers/${customer.id}`}
                          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                          aria-label={`View ${customer.full_name}`}
                        >
                          <Pencil />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${customer.full_name}`}
                          onClick={() => handleDelete(customer)}
                          disabled={isDeleting(customer.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
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
            {pagination.total} customers
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