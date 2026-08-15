import type { Metadata } from "next";

import { QueryProvider } from "@/components/providers/query-provider";
import { CustomerForm } from "@/components/customers/customer-form";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Add Customer — SAYYIF",
};

export default async function NewCustomerPage() {
  const { user } = await requireSession();
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
        <h1 className="text-2xl font-semibold tracking-tight">Add customer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a customer record with their contact details.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <QueryProvider>
          <CustomerForm
            actorRole={actorRole}
            actorShopId={user.shop_id ?? ""}
            shops={shops}
          />
        </QueryProvider>
      </div>
    </div>
  );
}
