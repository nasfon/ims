"use client";

import Link from "next/link";
import { AlertTriangle, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

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
import { useDeleteProduct, useProducts } from "@/hooks/use-products";
import { cn, formatNaira } from "@/lib/utils";
import type { ProductItem } from "@/types/products";

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
  { value: "name", label: "Name" },
  { value: "sku", label: "SKU" },
  { value: "quantity", label: "Quantity" },
  { value: "selling_price", label: "Price" },
  { value: "minimum_stock", label: "Min. stock" },
  { value: "created_at", label: "Created" },
] as const;

function isLowStock(product: ProductItem): boolean {
  return product.quantity <= product.minimum_stock;
}

function StockCell({ product }: { product: ProductItem }) {
  const low = isLowStock(product);
  return (
    <div className="flex items-center gap-2">
      <span>{product.quantity}</span>
      {low ? (
        <Badge variant="destructive">Low</Badge>
      ) : (
        <Badge variant="outline">OK</Badge>
      )}
    </div>
  );
}

function StatusCell({ isActive }: { isActive: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        className={cn(
          "size-2 rounded-full",
          isActive ? "bg-emerald-500" : "bg-zinc-400",
        )}
      />
      <span className="text-muted-foreground">{isActive ? "Active" : "Inactive"}</span>
    </span>
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

export function ProductsTable({ canManage }: { canManage: boolean }) {
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const search = useDebouncedValue(searchText);

  const { data, isPending, error } = useProducts({
    page,
    limit: PAGE_SIZE,
    search,
    sort,
    sortDir,
    status,
    lowStock: false,
  });
  const { mutate: removeProduct, isPending: deleting, variables: deletingId } =
    useDeleteProduct();

  const products = data?.items ?? [];
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

  function handleDelete(product: ProductItem) {
    if (
      window.confirm(
        `Delete "${product.name}"? Its history stays intact, but it will no longer be available for sales.`,
      )
    ) {
      removeProduct(product.id);
    }
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
              placeholder="Search name or SKU…"
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Link
            href="/products/low-stock"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <AlertTriangle className="text-amber-500" />
            Low stock
          </Link>
        </div>
        {canManage ? (
          <Link href="/products/new" className={buttonVariants({ size: "sm" })}>
            <Plus />
            Add product
          </Link>
        ) : null}
      </div>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Name" field="name" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="SKU" field="sku" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Quantity" field="quantity" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Selling price" field="selling_price" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Min. stock" field="minimum_stock" sort={sort} sortDir={sortDir} onSort={handleSort} />
              <TableHead>Status</TableHead>
              {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 7 : 6}
                  className="h-24 text-center text-muted-foreground"
                >
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  Loading products…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 7 : 6}
                  className="h-24 text-center text-destructive"
                >
                  {error.message}
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 7 : 6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                  <TableCell>
                    <StockCell product={product} />
                  </TableCell>
                  <TableCell>{formatNaira(product.selling_price)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.minimum_stock}
                  </TableCell>
                  <TableCell>
                    <StatusCell isActive={product.is_active} />
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Link
                          href={`/products/${product.id}`}
                          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${product.name}`}
                          onClick={() => handleDelete(product)}
                          disabled={isDeleting(product.id)}
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
            {pagination.total} products
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