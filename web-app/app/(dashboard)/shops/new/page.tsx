import type { Metadata } from "next";

import { QueryProvider } from "@/components/providers/query-provider";
import { ShopForm } from "@/components/shops/shop-form";
import { requireSuperAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Add Shop — SAYYIF",
};

export default async function NewShopPage() {
  await requireSuperAdmin();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Add shop</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a shop location and its receipt details.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <QueryProvider>
          <ShopForm mode="create" />
        </QueryProvider>
      </div>
    </div>
  );
}
