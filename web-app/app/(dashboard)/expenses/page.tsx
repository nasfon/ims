import type { Metadata } from "next";

import { ExpensesShell } from "@/components/expenses/expenses-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { requireUserManager } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Expenses — SAYYIF PREMIUM FLOUR MASTER LTD",
};

export default async function ExpensesPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record and manage business expenses.
        </p>
      </div>

      <QueryProvider>
        <ExpensesShell
          actorRole={actorRole}
          actorShopId={user.shop_id ?? ""}
          shops={shops}
        />
      </QueryProvider>
    </div>
  );
}