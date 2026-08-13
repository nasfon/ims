import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { QueryProvider } from "@/components/providers/query-provider";
import { ProductForm } from "@/components/products/product-form";
import { requireUserManager } from "@/lib/auth";
import { mapProductRow } from "@/lib/products";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/validation/products";

export const metadata: Metadata = {
  title: "Edit Product — IMS",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { user } = await requireUserManager();
  const actorRole = user.role_slug ?? ROLES.CASHIER;
  const { productId } = await params;

  if (!UUID_RE.test(productId)) {
    redirect("/products");
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .is("deleted_at", null)
    .single();

  if (!target) notFound();

  // RLS scopes products to the user's shop; this is a redundant guard.
  if (actorRole === ROLES.SHOP_ADMIN && target.shop_id !== user.shop_id) {
    redirect("/products");
  }

  let shops: { id: string; name: string }[] | null = null;
  if (actorRole === ROLES.SUPER_ADMIN) {
    const { data } = await supabase.from("shops").select("id, name").order("name");
    shops = data ?? [];
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Edit product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update details for {target.name}.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <QueryProvider>
          <ProductForm
            mode="edit"
            initial={mapProductRow(target)}
            actorShopId={user.shop_id ?? ""}
            shops={shops}
          />
        </QueryProvider>
      </div>
    </div>
  );
}