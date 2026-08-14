"use client";

import { useParams } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Minus,
  PenLine,
  Plus,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

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
import { useProducts } from "@/hooks/use-products";
import {
  useCorrectSale,
  useReverseSale,
  useSale,
  type ApiError,
} from "@/hooks/use-sales";
import { cn, formatNaira } from "@/lib/utils";
import type { ProductItem } from "@/types/products";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "pos", label: "POS" },
] as const;

type Mode = "correct" | "reverse" | null;

type DisplayLine = {
  product_id: string;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  /** Current stock; MAX_SAFE_INTEGER when the product could not be loaded. */
  available: number;
  unavailable?: boolean;
};

type AddedItem = {
  product_id: string;
  product: ProductItem;
  quantity: number;
};

async function fetchProduct(productId: string): Promise<ProductItem> {
  const res = await fetch(`/api/v1/products/${productId}`, {
    headers: { "Content-Type": "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Unable to load product.");
  }
  return json.data as ProductItem;
}

function ReasonField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>Reason (required)</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-24 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80"
        aria-invalid={value.trim() === ""}
      />
      <p className="text-xs text-muted-foreground">The reason is saved to the audit log.</p>
    </div>
  );
}

/** Live product search used to add items to a correction. Mounted only when open. */
function ProductSearch({
  shopId,
  onAdd,
  addedIds,
}: {
  shopId: string;
  onAdd: (product: ProductItem) => void;
  addedIds: Set<string>;
}) {
  const [search, setSearch] = useState("");
  const { data, isPending } = useProducts({
    page: 1,
    limit: 8,
    search,
    sort: "name",
    sortDir: "asc",
    status: "active",
    lowStock: false,
    shopId,
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search and add a product…"
          className="h-8 pl-7 text-sm"
        />
      </div>
      {search ? (
        <div className="flex flex-col gap-1">
          {isPending ? (
            <p className="px-1 text-sm text-muted-foreground">Searching…</p>
          ) : (data?.items ?? []).length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">No products found.</p>
          ) : (
            (data?.items ?? []).map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{product.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {product.sku} · {product.quantity} in stock
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatNaira(product.selling_price)}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={addedIds.has(product.id) || product.quantity <= 0}
                    onClick={() => onAdd(product)}
                  >
                    <Plus />
                    Add
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Correction/reversal controls for a completed sale. Role-restricted: the page
 * only renders this for Super Admins / Shop Admins (see sales/[saleId]/page.tsx).
 * Reversal restores stock; correction re-prices items from current product data.
 */
export function SaleActions({ canManage }: { canManage: boolean }) {
  const { saleId } = useParams<{ saleId: string }>();
  const { data: sale, isPending } = useSale(saleId);

  const [mode, setMode] = useState<Mode>(null);
  const [lineQtys, setLineQtys] = useState<Record<string, number>>({});
  const [extras, setExtras] = useState<AddedItem[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [reason, setReason] = useState("");
  const [saleError, setSaleError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const correct = useCorrectSale();
  const reverse = useReverseSale();

  const saleItems = sale?.items ?? [];
  const currentProducts = useQueries({
    queries: saleItems.map((item) => ({
      queryKey: ["product", item.product_id],
      queryFn: () => fetchProduct(item.product_id),
      enabled: canManage && mode === "correct",
      retry: false,
      staleTime: 30_000,
    })),
  });

  const liveProducts = useMemo(() => {
    const map = new Map<string, ProductItem>();
    for (const query of currentProducts) {
      if (query.data) map.set(query.data.id, query.data);
    }
    return map;
  }, [currentProducts]);

  const displayLines = useMemo<DisplayLine[]>(() => {
    const base: DisplayLine[] = (sale?.items ?? [])
      .filter((item) => !removedIds.has(item.product_id))
      .map((item) => {
        const live = liveProducts.get(item.product_id);
        return {
          product_id: item.product_id,
          name: item.product?.name ?? "Product",
          sku: item.product?.sku ?? "",
          quantity: lineQtys[item.product_id] ?? item.quantity,
          unit_price: live?.selling_price ?? item.unit_price,
          available: live?.quantity ?? Number.MAX_SAFE_INTEGER,
          unavailable: live ? !live.is_active : undefined,
        };
      });
    const added: DisplayLine[] = extras.map((ex) => ({
      product_id: ex.product_id,
      name: ex.product.name,
      sku: ex.product.sku,
      quantity: ex.quantity,
      unit_price: ex.product.selling_price,
      available: ex.product.quantity,
    }));
    return [...base, ...added];
  }, [sale, removedIds, lineQtys, extras, liveProducts]);

  const subtotal = displayLines.reduce(
    (sum, line) => sum + line.unit_price * line.quantity,
    0,
  );
  const discountValue = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, subtotal - discountValue);
  const amountPaidValue = Math.max(0, Number(amountPaid) || 0);
  const remainingCredit = Math.max(0, total - amountPaidValue);

  const addedIds = useMemo(() => {
    const set = new Set<string>();
    for (const line of displayLines) set.add(line.product_id);
    return set;
  }, [displayLines]);

  function resetPanel() {
    setSaleError(null);
    setReason("");
    setLineQtys({});
    setExtras([]);
    setRemovedIds(new Set());
    setDiscount("0");
    setPaymentMethod("cash");
    setAmountPaid("");
  }

  function openCorrect() {
    if (!sale) return;
    resetPanel();
    setDiscount(sale.discount > 0 ? String(sale.discount) : "0");
    setPaymentMethod(sale.payment_method);
    setAmountPaid(sale.amount_paid > 0 ? String(sale.amount_paid) : "");
    setMode("correct");
  }

  function openReverse() {
    resetPanel();
    setMode("reverse");
  }

  function isOriginal(productId: string): boolean {
    return (sale?.items ?? []).some((item) => item.product_id === productId);
  }

  function changeQuantity(productId: string, delta: number) {
    if (isOriginal(productId)) {
      const base = sale?.items.find((item) => item.product_id === productId)?.quantity ?? 1;
      const current = lineQtys[productId] ?? base;
      setLineQtys((prev) => ({ ...prev, [productId]: Math.max(0, current + delta) }));
      return;
    }
    setExtras((prev) =>
      prev.map((ex) =>
        ex.product_id === productId
          ? { ...ex, quantity: Math.max(0, ex.quantity + delta) }
          : ex,
      ),
    );
  }

  function removeLine(productId: string) {
    if (isOriginal(productId)) {
      const next = new Set(removedIds);
      next.add(productId);
      setRemovedIds(next);
      return;
    }
    setExtras((prev) => prev.filter((ex) => ex.product_id !== productId));
  }

  function addProduct(product: ProductItem) {
    if (isOriginal(product.id)) {
      setRemovedIds((prev) => {
        if (!prev.has(product.id)) return prev;
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
      setLineQtys((prev) => ({ ...prev, [product.id]: prev[product.id] ?? 1 }));
      return;
    }
    setExtras((prev) =>
      prev.some((ex) => ex.product_id === product.id)
        ? prev
        : [...prev, { product_id: product.id, product, quantity: 1 }],
    );
  }

  function submitCorrection() {
    setSaleError(null);
    if (!sale) return;

    const trimmedReason = reason.trim();
    const activeLines = displayLines.filter((line) => line.quantity > 0);

    if (!trimmedReason) {
      setSaleError("A reason is required.");
      return;
    }
    if (activeLines.length === 0) {
      setSaleError("Add at least one item to the corrected sale.");
      return;
    }
    const inactive = activeLines.find((line) => line.unavailable === true);
    if (inactive) {
      setSaleError(`${inactive.name} is no longer active.`);
      return;
    }
    const overstock = activeLines.find(
      (line) =>
        line.available !== Number.MAX_SAFE_INTEGER && line.quantity > line.available,
    );
    if (overstock) {
      setSaleError(`Not enough stock for ${overstock.name}.`);
      return;
    }
    if (discountValue > subtotal) {
      setSaleError("Discount cannot exceed the subtotal.");
      return;
    }
    if (amountPaidValue > total) {
      setSaleError("Amount paid cannot exceed the sale total.");
      return;
    }

    correct.mutate(
      {
        saleId: sale.id,
        values: {
          reason: trimmedReason,
          discount: discountValue,
          payment_method: paymentMethod,
          amount_paid: amountPaidValue,
          items: activeLines.map((line) => ({
            product_id: line.product_id,
            quantity: line.quantity,
          })),
        },
      },
      {
        onSuccess: () => {
          setSuccess("Sale corrected. Prices and stock were refreshed from current product data.");
          setMode(null);
        },
        onError: (err) =>
          setSaleError((err as ApiError).message ?? "Unable to correct sale."),
      },
    );
  }

  function submitReversal() {
    setSaleError(null);
    if (!sale) return;

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setSaleError("A reason is required.");
      return;
    }

    reverse.mutate(
      { saleId: sale.id, reason: trimmedReason },
      {
        onSuccess: () => {
          setSuccess("Sale reversed. All items were returned to stock.");
          setMode(null);
        },
        onError: (err) =>
          setSaleError((err as ApiError).message ?? "Unable to reverse sale."),
      },
    );
  }

  if (isPending || !sale) return null;
  if (!canManage) return null;

  const busy = correct.isPending || reverse.isPending;

  return (
    <div className="flex flex-col gap-4 print:hidden">
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

      {sale.status === "completed" && mode === null ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={openCorrect}>
            <PenLine />
            Correct sale
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={openReverse}
            className="text-destructive hover:text-destructive"
          >
            <Undo2 />
            Reverse sale
          </Button>
        </div>
      ) : null}

      {mode === "correct" && sale ? (
        <Card>
          <CardHeader>
            <CardTitle>Correct sale {sale.receipt_number}</CardTitle>
            <CardDescription>
              Adjust items, discount and payment, then explain why. Prices and stock
              are recalculated from current product data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ReasonField
              value={reason}
              onChange={setReason}
              placeholder="Explain why this sale is being corrected…"
            />

            <div className="rounded-lg border border-border p-3">
              <ProductSearch shopId={sale.shop_id} onAdd={addProduct} addedIds={addedIds} />

              {displayLines.length === 0 ? (
                <p className="pt-3 text-center text-sm text-muted-foreground">
                  No items in the corrected sale.
                </p>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  {displayLines.map((line) => {
                    const inactive = line.unavailable === true;
                    const overstocked =
                      line.available !== Number.MAX_SAFE_INTEGER &&
                      line.quantity > line.available;
                    return (
                      <div
                        key={line.product_id}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2",
                          inactive && "opacity-60",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{line.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {line.sku} · {formatNaira(line.unit_price)} each
                            {line.available !== Number.MAX_SAFE_INTEGER
                              ? ` · ${line.available} in stock`
                              : ""}
                          </div>
                          {inactive ? (
                            <div className="flex items-center gap-1 text-xs font-medium text-destructive">
                              <AlertTriangle className="size-3" />
                              No longer active
                            </div>
                          ) : overstocked ? (
                            <div className="flex items-center gap-1 text-xs font-medium text-destructive">
                              <AlertTriangle className="size-3" />
                              Insufficient stock
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Decrease ${line.name}`}
                            disabled={line.quantity <= 1}
                            onClick={() => changeQuantity(line.product_id, -1)}
                          >
                            <Minus />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {line.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Increase ${line.name}`}
                            disabled={overstocked}
                            onClick={() => changeQuantity(line.product_id, 1)}
                          >
                            <Plus />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="ml-1 text-destructive"
                            aria-label={`Remove ${line.name}`}
                            onClick={() => removeLine(line.product_id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Discount (₦)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Payment method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v ?? "cash")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select method" />
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

            <div className="flex flex-col gap-1.5">
              <Label>Amount paid (₦)</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Leave at zero to record the corrected sale fully on credit.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatNaira(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>- {formatNaira(discountValue)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-1.5 font-medium">
                <span>Total</span>
                <span>{formatNaira(total)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Amount paid</span>
                <span>{formatNaira(amountPaidValue)}</span>
              </div>
              <div
                className={cn(
                  "flex items-center justify-between",
                  remainingCredit > 0 && "font-medium text-destructive",
                )}
              >
                <span>Remaining credit</span>
                <span>{formatNaira(remainingCredit)}</span>
              </div>
            </div>

            {saleError ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saleError}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setMode(null);
                setSaleError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={submitCorrection}>
              {correct.isPending ? <Loader2 className="size-4 animate-spin" /> : <PenLine />}
              {correct.isPending ? "Correcting…" : "Confirm correction"}
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {mode === "reverse" && sale ? (
        <Card>
          <CardHeader>
            <CardTitle>Reverse sale {sale.receipt_number}</CardTitle>
            <CardDescription>
              This voids the sale and returns every item to stock. It cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ReasonField
              value={reason}
              onChange={setReason}
              placeholder="Explain why this sale is being reversed…"
            />

            {sale.remaining_credit > 0 ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-600/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Reversing removes {formatNaira(sale.remaining_credit)} of outstanding
                credit from the customer&apos;s balance.
              </div>
            ) : null}

            {saleError ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saleError}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setMode(null);
                setSaleError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || reason.trim() === ""}
              onClick={submitReversal}
            >
              {reverse.isPending ? <Loader2 className="size-4 animate-spin" /> : <Undo2 />}
              {reverse.isPending ? "Reversing…" : "Reverse sale"}
            </Button>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
}