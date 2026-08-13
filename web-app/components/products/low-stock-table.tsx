"use client";

import Link from "next/link";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLowStockProducts } from "@/hooks/use-products";
import { formatNaira } from "@/lib/utils";

const PAGE_SIZE = 10;

function useDebouncedValue(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function LowStockTable({ canManage }: { canManage: boolean }) {
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const search = useDebouncedValue(searchText);

  const { data, isPending, error } = useLowStockProducts({
    page,
    limit: PAGE_SIZE,
    search,
    includeInactive,
  });

  const products = data?.items ?? [];
  const pagination = data?.pagination;

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
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Include inactive</span>
          <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
        </div>
      </div>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">In stock</TableHead>
              <TableHead className="text-right">Min. stock</TableHead>
              <TableHead className="text-right">Selling price</TableHead>
              {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 6 : 5}
                  className="h-24 text-center text-muted-foreground"
                >
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                  Loading low stock products…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 6 : 5}
                  className="h-24 text-center text-destructive"
                >
                  {error.message}
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 6 : 5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No low stock products. Everything looks healthy!
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                      {product.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">
                    {product.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {product.minimum_stock}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNaira(product.selling_price)}
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <Link
                        href={`/products/${product.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Restock
                      </Link>
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
            {pagination.total} low stock products
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