import type { Metadata } from "next";

import { CustomersTable } from "@/components/customers/customers-table";
import { QueryProvider } from "@/components/providers/query-provider";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Customers — SAYYIF",
};

export default async function CustomersPage() {
  const { user } = await requireSession();
  const canManage =
    user.role_slug === ROLES.SUPER_ADMIN || user.role_slug === ROLES.SHOP_ADMIN;

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
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage customer details and outstanding credit.
        </p>
      </div>

      <QueryProvider>
        <CustomersTable
          canManage={canManage}
          actorRole={actorRole}
          actorShopId={user.shop_id ?? ""}
          shops={shops}
        />
      </QueryProvider>
    </div>
  );
}