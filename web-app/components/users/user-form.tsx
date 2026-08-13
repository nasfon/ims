"use client";

import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useCreateUser, useUpdateUser, type ApiError } from "@/hooks/use-users";
import { ROLES, ROLE_NAMES, type RoleSlug } from "@/lib/roles";
import type { ShopOption, UserItem } from "@/types/users";

type Props = {
  mode: "create" | "edit";
  initial?: UserItem;
  actorRole: RoleSlug;
  actorShopId: string;
  /** null when the actor is a Shop Admin (no shop selector). */
  shops: ShopOption[] | null;
};

export function UserForm({ mode, initial, actorRole, actorShopId, shops }: Props) {
  const router = useRouter();

  const roleOptions: RoleSlug[] =
    actorRole === ROLES.SUPER_ADMIN
      ? [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN, ROLES.CASHIER]
      : [ROLES.SHOP_ADMIN, ROLES.CASHIER];

  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initial?.role_slug ?? ROLES.CASHIER);
  const [shopId, setShopId] = useState(initial?.shop_id ?? actorShopId);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const create = useCreateUser();
  const update = useUpdateUser(initial?.id ?? "");

  const busy = create.isPending || update.isPending;

  function applyError(err: ApiError) {
    setFieldErrors(err.errors ?? {});
    setGeneralError(err.message ?? "Unable to save user.");
  }

  function finish(message?: string) {
    if (message) {
      router.replace(`/users?created=${encodeURIComponent(message)}`);
    } else {
      router.replace("/users");
    }
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (mode === "edit" && initial) {
      const values: Record<string, unknown> = {};
      if (fullName.trim() !== initial.full_name) values.full_name = fullName.trim();
      if (email.trim() !== (initial.email ?? "")) values.email = email.trim();
      if (phone !== (initial.phone ?? "")) values.phone = phone.trim() || null;
      if (role !== initial.role_slug) values.role_slug = role;
      if (isActive !== initial.is_active) values.is_active = isActive;
      if (shops && shopId !== initial.shop_id) values.shop_id = shopId;

      if (Object.keys(values).length === 0) return finish();
      update.mutate(values, {
        onSuccess: () => finish(),
        onError: (err) => applyError(err as ApiError),
      });
      return;
    }

    create.mutate(
      {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        role_slug: role,
        shop_id: shopId,
        is_active: isActive,
        ...(password ? { password } : {}),
      },
      {
        onSuccess: (data) => {
          if (data.temporaryPassword) {
            setTempPassword(data.temporaryPassword);
          } else {
            finish();
          }
        },
        onError: (err) => applyError(err as ApiError),
      },
    );
  }

  if (tempPassword) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User created</CardTitle>
          <CardDescription>
            Save these credentials — they won&apos;t be shown again. Share them with the new user.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-muted px-3 py-2 font-mono text-sm">
            {email}
            <br />
            {tempPassword}
          </div>
          <Button onClick={() => finish()}>Continue to users</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Add user" : "Edit user"}</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Create an account and assign a role and shop."
              : `Update profile and role for ${initial?.full_name ?? "this user"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={fieldErrors.full_name}>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required />
            </Field>
            <Field label="Email" error={fieldErrors.email}>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@shop.com" required />
            </Field>
            <Field label="Phone (optional)" error={fieldErrors.phone}>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" />
            </Field>
            {mode === "create" ? (
              <Field label="Temporary password" error={fieldErrors.password} hint="Leave blank to auto-generate one.">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            ) : null}
            <Field label="Role" error={fieldErrors.role ?? fieldErrors.role_slug}>
              <Select value={role} onValueChange={(v) => setRole((v ?? role) as RoleSlug)} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((slug) => (
                    <SelectItem key={slug} value={slug}>
                      {ROLE_NAMES[slug]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">Active account</div>
              <div className="text-xs text-muted-foreground">
                {isActive ? "The user can sign in." : "The user is blocked from signing in."}
              </div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {generalError ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{generalError}</p>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save />}
            {busy ? "Saving…" : "Save user"}
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
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}