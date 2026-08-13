import type { Metadata } from "next";

import { QueryProvider } from "@/components/providers/query-provider";
import { LowStockTable } from "@/components/products/low-stock-table";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Low Stock — IMS",
};

export default async function LowStockPage() {
  const { user } = await requireSession();
  const canManage =
    user.role_slug === ROLES.SUPER_ADMIN || user.role_slug === ROLES.SHOP_ADMIN;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Low stock</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Products at or below their minimum stock level.
        </p>
      </div>

      <QueryProvider>
        <LowStockTable canManage={canManage} />
      </QueryProvider>
    </div>
  );
}