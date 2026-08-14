import type { Metadata } from "next";

import { QueryProvider } from "@/components/providers/query-provider";
import { ReportsShell } from "@/components/reports/reports-shell";
import { requireUserManager } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reports — SAYYIF",
};

export default async function ReportsPage() {
  const { user } = await requireUserManager();

  const supabase = await createClient();
  let shops: { id: string; name: string }[] | null = null;
  if ((user.role_slug ?? ROLES.SHOP_ADMIN) === ROLES.SUPER_ADMIN) {
    const { data } = await supabase.from("shops").select("id, name").order("name");
    shops = data ?? [];
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate sales, revenue, expense, credit, and inventory reports.
        </p>
      </div>

      <QueryProvider>
        <ReportsShell shops={shops} />
      </QueryProvider>
    </div>
  );
}