import type { Metadata } from "next";

import { QueryProvider } from "@/components/providers/query-provider";
import { ProductsTable } from "@/components/products/products-table";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Products — SAYYIF",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const { user } = await requireSession();
  const canManage =
    user.role_slug === ROLES.SUPER_ADMIN || user.role_slug === ROLES.SHOP_ADMIN;
  const sp = await searchParams;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage stock items, prices, and reorder thresholds.
        </p>
      </div>

      {sp.created ? (
        <div className="mb-4 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {sp.created}
        </div>
      ) : null}

      <QueryProvider>
        <ProductsTable canManage={canManage} />
      </QueryProvider>
    </div>
  );
}