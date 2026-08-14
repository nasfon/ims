import type { Metadata } from "next";

import { QueryProvider } from "@/components/providers/query-provider";
import { ProductForm } from "@/components/products/product-form";
import { requireUserManager } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Add Product — SAYYIF",
};

export default async function NewProductPage() {
  const { user } = await requireUserManager();
  const actorRole = user.role_slug ?? ROLES.CASHIER;

  const supabase = await createClient();
  let shops: { id: string; name: string }[] | null = null;
  if (actorRole === ROLES.SUPER_ADMIN) {
    const { data } = await supabase.from("shops").select("id, name").order("name");
    shops = data ?? [];
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Add product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a stock item with price and reorder threshold.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <QueryProvider>
          <ProductForm actorShopId={user.shop_id ?? ""} shops={shops} mode="create" />
        </QueryProvider>
      </div>
    </div>
  );
}