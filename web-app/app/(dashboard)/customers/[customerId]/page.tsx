import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CustomerDetails } from "@/components/customers/customer-details";
import { QueryProvider } from "@/components/providers/query-provider";
import { requireSession } from "@/lib/auth";
import { mapCustomerRow } from "@/lib/customers";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/validation/customers";

export const metadata: Metadata = {
  title: "Customer — SAYYIF PREMIUM FLOUR MASTER LTD",
};

export default async function CustomerDetailsPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { user } = await requireSession();
  const actorRole = user.role_slug ?? ROLES.CASHIER;
  const { customerId } = await params;

  if (!UUID_RE.test(customerId)) {
    redirect("/customers");
  }

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .is("deleted_at", null)
    .single();

  if (!customer) notFound();

  // RLS scopes customers to the user's shop; this is a redundant guard.
  if (actorRole === ROLES.SHOP_ADMIN && customer.shop_id !== user.shop_id) {
    redirect("/customers");
  }

  const canManage =
    user.role_slug === ROLES.SUPER_ADMIN || user.role_slug === ROLES.SHOP_ADMIN;

  return (
    <div className="p-6">
      <QueryProvider>
        <CustomerDetails
          customerId={customerId}
          initial={mapCustomerRow(customer)}
          canManage={canManage}
        />
      </QueryProvider>
    </div>
  );
}