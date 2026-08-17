"use client";

import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import {
  useCreateProduct,
  useUpdateProduct,
  type ApiError,
} from "@/hooks/use-products";
import type { ProductItem } from "@/types/products";

type Props = {
  mode: "create" | "edit";
  initial?: ProductItem;
  actorShopId: string;
  /** null when the actor is a Shop Admin (no shop selector). */
  shops: { id: string; name: string }[] | null;
  /** When set (modal usage), closes instead of navigating after save/cancel. */
  onClose?: () => void;
};

export function ProductForm({ mode, initial, actorShopId, shops, onClose }: Props) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [quantity, setQuantity] = useState(initial?.quantity != null ? String(initial.quantity) : "0");
  const [sellingPrice, setSellingPrice] = useState(
    initial?.selling_price != null ? String(initial.selling_price) : "",
  );
  const [minimumStock, setMinimumStock] = useState(
    initial?.minimum_stock != null ? String(initial.minimum_stock) : "0",
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [shopId, setShopId] = useState(initial?.shop_id ?? actorShopId);

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const create = useCreateProduct();
  const update = useUpdateProduct(initial?.id ?? "");

  const busy = create.isPending || update.isPending;

  function applyError(err: ApiError) {
    setFieldErrors(err.errors ?? {});
    setGeneralError(err.message ?? "Unable to save product.");
  }

  function finish(message?: string) {
    if (onClose) {
      onClose();
      return;
    }
    if (message) {
      router.replace(`/products?created=${encodeURIComponent(message)}`);
    } else {
      router.replace("/products");
    }
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (mode === "edit" && initial) {
      const values: Record<string, unknown> = {};
      if (name.trim() !== initial.name) values.name = name.trim();
      if (sku.trim() !== initial.sku) values.sku = sku.trim();
      if (Number(quantity) !== initial.quantity) values.quantity = Number(quantity);
      if (Number(sellingPrice) !== initial.selling_price) values.selling_price = Number(sellingPrice);
      if (Number(minimumStock) !== initial.minimum_stock) values.minimum_stock = Number(minimumStock);
      if (isActive !== initial.is_active) values.is_active = isActive;

      if (Object.keys(values).length === 0) return finish();
      update.mutate(values, {
        onSuccess: () => finish(),
        onError: (err) => applyError(err as ApiError),
      });
      return;
    }

    create.mutate(
      {
        name: name.trim(),
        sku: sku.trim(),
        quantity: Number(quantity),
        selling_price: Number(sellingPrice),
        minimum_stock: Number(minimumStock),
        is_active: isActive,
        ...(shops ? { shop_id: shopId } : {}),
      },
      {
        onSuccess: () => finish(),
        onError: (err) => applyError(err as ApiError),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Add product" : "Edit product"}</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Create a stock item with price and reorder threshold."
              : `Update ${initial?.name ?? "this product"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name" error={fieldErrors.name}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bottled water" required />
            </Field>
            <Field label="SKU" error={fieldErrors.sku} hint="Unique within this shop.">
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="WTR-001" required />
            </Field>

            {shops ? (
              <Field label="Shop" error={fieldErrors.shop_id}>
                <Select value={shopId} onValueChange={(v) => setShopId(v ?? shopId)} required>
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
              </Field>
            ) : null}

            <Field
              label="Selling price (₦)"
              error={fieldErrors.selling_price}
              hint="Must be greater than zero."
            >
              <Input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="1500.00"
                required
              />
            </Field>
            <Field label="Quantity" error={fieldErrors.quantity}>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>
            <Field label="Minimum stock" error={fieldErrors.minimum_stock}>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">Active product</div>
              <div className="text-xs text-muted-foreground">
                {isActive ? "Available for sale." : "Hidden from sales."}
              </div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {generalError ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{generalError}</p>
          ) : null}
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
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save />}
            {busy ? "Saving…" : "Save product"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}