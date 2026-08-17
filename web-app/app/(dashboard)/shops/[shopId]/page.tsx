import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QueryProvider } from "@/components/providers/query-provider";
import { ShopForm } from "@/components/shops/shop-form";
import { ShopUsers } from "@/components/shops/shop-users";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Shop } from "@/lib/shops";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = {
  title: "Edit Shop — SAYYIF",
};

const SHOP_FIELDS =
  "id, name, phone, email, address, logo_url, receipt_footer, is_active, created_at, updated_at";

export default async function EditShopPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  await requireSuperAdmin();
  const { shopId } = await params;

  if (!UUID_RE.test(shopId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select(SHOP_FIELDS)
    .eq("id", shopId)
    .single();

  if (!shop) notFound();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Edit shop</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update this shop&apos;s details.
        </p>
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <QueryProvider>
          <ShopForm mode="edit" initial={shop as Shop} />
          <ShopUsers shopId={shop.id} />
        </QueryProvider>
      </div>
    </div>
  );
}
