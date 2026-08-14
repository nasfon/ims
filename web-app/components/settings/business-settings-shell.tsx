"use client";

import { CheckCircle2, Loader2, Save, X } from "lucide-react";
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
  useBusinessSettings,
  useUpdateBusinessSettings,
  type ApiError,
} from "@/hooks/use-settings";
import { ROLES, type RoleSlug } from "@/lib/roles";
import type { BusinessSettings } from "@/types/settings";
import type { ShopOption } from "@/types/users";

function LogoPreview({ url, name }: { url: string | null; name: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-lg font-semibold text-muted-foreground"
        aria-hidden
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`${name} logo`}
            className="size-full object-contain"
          />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {url ? "Logo will appear on receipts." : "No logo set — the business name will be shown on receipts."}
      </p>
    </div>
  );
}

/** The editable form, seeded from props. Remounted per shop via `key`. */
function SettingsForm({
  settings,
  shopId,
}: {
  settings: BusinessSettings;
  shopId: string;
}) {
  const update = useUpdateBusinessSettings(shopId);

  const [businessName, setBusinessName] = useState(settings.business_name);
  const [phone, setPhone] = useState(settings.phone ?? "");
  const [address, setAddress] = useState(settings.address ?? "");
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? "");
  const [receiptFooter, setReceiptFooter] = useState(settings.receipt_footer ?? "");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function applyError(err: ApiError) {
    setFieldErrors(err.errors ?? {});
    setFormError(err.message ?? "Unable to save settings.");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setSuccess(null);

    const values: Record<string, unknown> = {};
    if (businessName.trim() !== settings.business_name) {
      values.business_name = businessName.trim();
    }
    if ((phone.trim() || null) !== settings.phone) {
      values.phone = phone.trim() || null;
    }
    if ((address.trim() || null) !== settings.address) {
      values.address = address.trim() || null;
    }
    if ((logoUrl.trim() || null) !== settings.logo_url) {
      values.logo_url = logoUrl.trim() || null;
    }
    if ((receiptFooter.trim() || null) !== settings.receipt_footer) {
      values.receipt_footer = receiptFooter.trim() || null;
    }

    if (Object.keys(values).length === 0) {
      setSuccess("No changes to save.");
      return;
    }

    update.mutate(values, {
      onSuccess: () => setSuccess("Business settings saved."),
      onError: (err) => applyError(err as ApiError),
    });
  }

  const busy = update.isPending;

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

      <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Business information</CardTitle>
          <CardDescription>
            These details appear on printed and downloaded receipts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-business-name">Business name</Label>
            <Input
              id="settings-business-name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder={settings.business_name}
              disabled={busy}
            />
            {fieldErrors.business_name ? (
              <p className="text-xs text-destructive">{fieldErrors.business_name}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Logo</Label>
            <LogoPreview url={settings.logo_url} name={settings.business_name} />
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://… or /uploads/logo.png"
              disabled={busy}
            />
            {fieldErrors.logo_url ? (
              <p className="text-xs text-destructive">{fieldErrors.logo_url}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-phone">Contact information</Label>
            <Input
              id="settings-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              disabled={busy}
            />
            {fieldErrors.phone ? (
              <p className="text-xs text-destructive">{fieldErrors.phone}</p>
            ) : null}
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Business address"
              disabled={busy}
              className="mt-2"
            />
            {fieldErrors.address ? (
              <p className="text-xs text-destructive">{fieldErrors.address}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Receipt footer</Label>
            <textarea
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="e.g. All goods once sold are not returnable. Thank you!"
              rows={3}
              disabled={busy}
              className="min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30 dark:disabled:bg-input/80"
            />
            {fieldErrors.receipt_footer ? (
              <p className="text-xs text-destructive">{fieldErrors.receipt_footer}</p>
            ) : null}
          </div>

          {formError ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save />}
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </CardFooter>
        </Card>
      </form>
    </div>
  );
}

export function BusinessSettingsShell({
  actorRole,
  actorShopId,
  shops,
}: {
  actorRole: RoleSlug;
  actorShopId: string;
  /** null when the actor is a Shop Admin (no shop selector). */
  shops: ShopOption[] | null;
}) {
  const isSuperAdmin = actorRole === ROLES.SUPER_ADMIN;
  const [shopId, setShopId] = useState(isSuperAdmin ? "" : actorShopId);
  const resolvedShopId = isSuperAdmin ? shopId : actorShopId;

  const { data: settings, isPending, error } = useBusinessSettings(resolvedShopId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {shops ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Shop</span>
            <Select value={shopId} onValueChange={(v) => setShopId(v ?? "")}>
              <SelectTrigger className="w-auto min-w-44">
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
      </div>

      {isPending ? (
        <div className="flex items-center justify-center rounded-xl border border-border p-12 text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading business settings…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error.message}
        </div>
      ) : !settings ? null : isSuperAdmin && !shopId ? (
        <div className="rounded-xl border border-border p-8 text-center text-muted-foreground">
          Select a shop to edit its settings.
        </div>
      ) : (
        <SettingsForm
          key={settings.id}
          settings={settings}
          shopId={resolvedShopId}
        />
      )}
    </div>
  );
}