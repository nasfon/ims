"use client";

import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
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
import { useCustomers } from "@/hooks/use-customers";
import { useProducts } from "@/hooks/use-products";
import { useCreateSale, type ApiError } from "@/hooks/use-sales";
import {
  calcAmountPaid,
  calcDiscount,
  calcRemainingCredit,
  calcSubtotal,
  calcTotal,
} from "@/lib/calculations";
import { cn, formatNaira } from "@/lib/utils";
import type { ProductItem } from "@/types/products";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "pos", label: "POS" },
] as const;

type CartLine = {
  product_id: string;
  quantity: number;
  name: string;
  sku: string;
  selling_price: number;
  available: number;
};

type Props = {
  actorShopId: string;
  /** null when the actor is not a Super Admin (no shop selector). */
  shops: { id: string; name: string }[] | null;
  /** When set (modal usage), closes instead of navigating after cancel. */
  onClose?: () => void;
};

export function SaleForm({ actorShopId, shops, onClose }: Props) {
  const router = useRouter();

  const [shopId, setShopId] = useState(actorShopId);
  const [customerId, setCustomerId] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");

  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: productsData, isPending: productsPending } = useProducts({
    page: 1,
    limit: 8,
    search: productSearch,
    sort: "name",
    sortDir: "asc",
    status: "active",
    lowStock: false,
    ...(shops ? { shopId } : {}),
  });

  const { data: customersData, isPending: customersPending } = useCustomers({
    page: 1,
    limit: 8,
    search: customerSearch,
    sort: "full_name",
    sortDir: "asc",
    ...(shops ? { shopId } : {}),
  });

  const create = useCreateSale();

  const busy = create.isPending;

  const subtotal = useMemo(
    () => calcSubtotal(cart.map((line) => ({ unit_price: line.selling_price, quantity: line.quantity }))),
    [cart],
  );
  const discountValue = calcDiscount(subtotal, Number(discount) || 0);
  const total = calcTotal(subtotal, discountValue);
  const amountPaidValue = calcAmountPaid(Number(amountPaid) || 0);
  const remainingCredit = calcRemainingCredit(total, amountPaidValue);

  const selectedCustomer = customersData?.items.find((c) => c.id === customerId);

  const inCart = (productId: string) => cart.some((line) => line.product_id === productId);

  function addToCart(product: ProductItem) {
    setCart((prev) => {
      const existing = prev.find((line) => line.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map((line) =>
          line.product_id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          quantity: 1,
          name: product.name,
          sku: product.sku,
          selling_price: product.selling_price,
          available: product.quantity,
        },
      ];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((line) =>
          line.product_id === productId
            ? { ...line, quantity: Math.max(0, line.quantity + delta) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function applyError(err: ApiError) {
    setFieldErrors(err.errors ?? {});
    setGeneralError(err.message ?? "Unable to record sale.");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (cart.length === 0) {
      setGeneralError("Add at least one item to the sale.");
      return;
    }

    create.mutate(
      {
        ...(shops ? { shop_id: shopId } : {}),
        ...(customerId ? { customer_id: customerId } : {}),
        discount: discountValue,
        payment_method: paymentMethod,
        amount_paid: amountPaidValue,
        items: cart.map((line) => ({
          product_id: line.product_id,
          quantity: line.quantity,
        })),
      },
      {
        onSuccess: (sale) => {
          if (onClose) onClose();
          router.replace(`/sales/${sale.id}`);
          router.refresh();
        },
        onError: (err) => applyError(err as ApiError),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
            <CardDescription>
              Search for a customer or leave blank for a walk-in sale.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {shops ? (
              <div className="flex flex-col gap-1.5">
                <Label>Shop</Label>
                <Select value={shopId} onValueChange={(v) => setShopId(v ?? "")}>
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
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label>Search customer</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setCustomerId("");
                  }}
                  placeholder="Search by name or phone…"
                  className="pl-8"
                />
              </div>
              {customerSearch ? (
                <div className="mt-1 flex flex-col gap-1">
                  {customersPending ? (
                    <p className="px-1 text-sm text-muted-foreground">Searching…</p>
                  ) : (customersData?.items ?? []).length === 0 ? (
                    <p className="px-1 text-sm text-muted-foreground">No customers found.</p>
                  ) : (
                    (customersData?.items ?? []).map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => {
                          setCustomerId(customer.id);
                          setCustomerSearch(customer.full_name);
                        }}
                        className={cn(
                          "flex items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-accent",
                          customerId === customer.id && "bg-accent",
                        )}
                      >
                        <span className="font-medium">{customer.full_name}</span>
                        <span className="text-muted-foreground">{customer.phone}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
              {selectedCustomer ? (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedCustomer.full_name} ·{" "}
                  {selectedCustomer.total_credit > 0
                    ? `outstanding ${formatNaira(selectedCustomer.total_credit)}`
                    : "no outstanding credit"}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Walk-in sale (no customer).</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Products</CardTitle>
            <CardDescription>Search and add items to this sale.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search product name or SKU…"
                className="pl-8"
              />
            </div>
            <div className="flex flex-col gap-1">
              {productsPending ? (
                <p className="px-1 text-sm text-muted-foreground">Searching…</p>
              ) : (productsData?.items ?? []).length === 0 ? (
                <p className="px-1 text-sm text-muted-foreground">No products found.</p>
              ) : (
                (productsData?.items ?? []).map((product) => (
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
                        disabled={inCart(product.id) || product.quantity <= 0}
                        onClick={() => addToCart(product)}
                      >
                        <Plus />
                        Add
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
            <CardDescription>Adjust quantities before payment.</CardDescription>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <ShoppingCart className="size-6" />
                <p className="text-sm">No items added yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {cart.map((line) => (
                  <div
                    key={line.product_id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{line.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {formatNaira(line.selling_price)} each · {line.available} available
                      </div>
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
                      <span className="w-8 text-center text-sm font-medium">{line.quantity}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Increase ${line.name}`}
                        disabled={line.quantity >= line.available}
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
                        onClick={() =>
                          setCart((prev) =>
                            prev.filter((l) => l.product_id !== line.product_id),
                          )
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment</CardTitle>
            <CardDescription>Payment method and amount received.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v ?? "cash")}>
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
                Leave at zero to record the sale fully on credit.
              </p>
            </div>

            {generalError ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {generalError}
              </p>
            ) : null}

            {Object.keys(fieldErrors).length > 0 ? (
              <ul className="flex flex-col gap-1 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {Object.entries(fieldErrors).map(([key, message]) => (
                  <li key={key}>
                    {key}: {message}
                  </li>
                ))}
              </ul>
            ) : null}

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
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => (onClose ? onClose() : router.back())}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus />}
              {busy ? "Recording…" : "Record sale"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  );
}