import type { Metadata } from "next";

import { CustomersTable } from "@/components/customers/customers-table";
import { QueryProvider } from "@/components/providers/query-provider";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Customers — SAYYIF PREMIUM FLOUR MASTER LTD",
};

export default async function CustomersPage() {
  const { user } = await requireSession();
  const canManage =
    user.role_slug === ROLES.SUPER_ADMIN || user.role_slug === ROLES.SHOP_ADMIN;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage customer details and outstanding credit.
        </p>
      </div>

      <QueryProvider>
        <CustomersTable canManage={canManage} />
      </QueryProvider>
    </div>
  );
}