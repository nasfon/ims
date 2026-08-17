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
import { Switch } from "@/components/ui/switch";
import { useCreateShop, useUpdateShop, type ApiError } from "@/hooks/use-shops";
import type { Shop, ShopInput } from "@/lib/shops";

type Props = {
  mode: "create" | "edit";
  initial?: Shop;
  /** When set (modal usage), closes instead of navigating after save/cancel. */
  onClose?: () => void;
};

export function ShopForm({ mode, initial, onClose }: Props) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [receiptFooter, setReceiptFooter] = useState(initial?.receipt_footer ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const create = useCreateShop();
  const update = useUpdateShop();

  const busy = create.isPending || update.isPending;

  function applyError(err: ApiError) {
    setFieldErrors(err.errors ?? {});
    setGeneralError(err.message ?? "Unable to save shop.");
  }

  function finish() {
    if (onClose) {
      onClose();
      return;
    }
    router.replace("/shops");
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const values: ShopInput = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      receipt_footer: receiptFooter.trim() || null,
      is_active: isActive,
    };

    if (mode === "edit" && initial) {
      const changed: Partial<ShopInput> = {};
      if (values.name !== initial.name) changed.name = values.name;
      if (values.phone !== (initial.phone ?? "")) changed.phone = values.phone;
      if (values.email !== (initial.email ?? "")) changed.email = values.email;
      if (values.address !== (initial.address ?? "")) changed.address = values.address;
      if (values.receipt_footer !== (initial.receipt_footer ?? "")) {
        changed.receipt_footer = values.receipt_footer;
      }
      if (isActive !== initial.is_active) changed.is_active = isActive;

      if (Object.keys(changed).length === 0) return finish();
      update.mutate(
        { shopId: initial.id, input: changed },
        { onSuccess: finish, onError: (err) => applyError(err as ApiError) },
      );
      return;
    }

    create.mutate(values, {
      onSuccess: finish,
      onError: (err) => applyError(err as ApiError),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Add shop" : "Edit shop"}</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Create a shop location and its receipt details."
              : "Update this shop's details."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Shop name" error={fieldErrors.name}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ikeja Branch"
              required
            />
          </Field>
          <Field label="Phone" error={fieldErrors.phone}>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 800 000 0000"
            />
          </Field>
          <Field label="Email" error={fieldErrors.email}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="shop@sayyif.com"
            />
          </Field>
          <Field label="Address" error={fieldErrors.address}>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="12 Market Road, Lagos"
            />
          </Field>
          <Field label="Receipt footer" error={fieldErrors.receipt_footer}>
            <Input
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="Thank you for your patronage!"
            />
          </Field>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">Active</div>
              <div className="text-xs text-muted-foreground">
                {isActive
                  ? "This shop appears in dropdowns and can trade."
                  : "Inactive shops are hidden from staff selection."}
              </div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {generalError ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {generalError}
            </p>
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
            {busy ? "Saving…" : "Save shop"}
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
