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
import { useCreateCustomer, type ApiError } from "@/hooks/use-customers";
import { ROLES, type RoleSlug } from "@/lib/roles";
import type { ShopOption } from "@/types/users";

type Props = {
  actorRole: RoleSlug;
  actorShopId: string;
  /** null when the actor is a Shop Admin (no shop selector). */
  shops: ShopOption[] | null;
};

export function CustomerForm({ actorRole, actorShopId, shops }: Props) {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [shopId, setShopId] = useState(actorShopId);

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const create = useCreateCustomer();
  const busy = create.isPending;

  function applyError(err: ApiError) {
    setFieldErrors(err.errors ?? {});
    setGeneralError(err.message ?? "Unable to save customer.");
  }

  function finish() {
    router.replace("/customers");
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    create.mutate(
      {
        shop_id: shops ? shopId : actorShopId,
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        address: address.trim() || null,
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
          <CardTitle>Add customer</CardTitle>
          <CardDescription>
            Create a customer record with their contact details.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={fieldErrors.full_name}>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </Field>
            <Field label="Phone" error={fieldErrors.phone}>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                required
              />
            </Field>
            <Field label="Email (optional)" error={fieldErrors.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@shop.com"
              />
            </Field>
            <Field label="Address (optional)" error={fieldErrors.address}>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Market Road, Lagos"
              />
            </Field>
            {shops ? (
              <Field label="Shop" error={fieldErrors.shop_id}>
                <Select
                  value={shopId}
                  onValueChange={(v) => setShopId(v ?? shopId)}
                  required
                >
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
            onClick={() => router.back()}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save />}
            {busy ? "Saving…" : "Save customer"}
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
