import type { Metadata } from "next";

import { SalesTable } from "@/components/sales/sales-table";
import { QueryProvider } from "@/components/providers/query-provider";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Sales — IMS",
};

export default async function SalesPage() {
  const { user } = await requireSession();
  const canCreate =
    user.role_slug === ROLES.SUPER_ADMIN ||
    user.role_slug === ROLES.SHOP_ADMIN ||
    user.role_slug === ROLES.CASHIER;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View sales history, search receipts, and track payment methods.
        </p>
      </div>

      <QueryProvider>
        <SalesTable canManage={canCreate} />
      </QueryProvider>
    </div>
  );
}