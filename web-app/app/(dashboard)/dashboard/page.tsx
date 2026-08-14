import type { Metadata } from "next";

import { DashboardWidgets } from "@/components/dashboard/dashboard-widgets";
import { QueryProvider } from "@/components/providers/query-provider";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Dashboard — IMS",
};

export default async function DashboardPage() {
  const { user } = await requireSession();
  const actorRole = user.role_slug ?? ROLES.CASHIER;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {user.full_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening in {user.shop_name ?? "your shop"} today.
        </p>
      </div>

      <QueryProvider>
        <DashboardWidgets actorRole={actorRole} />
      </QueryProvider>
    </div>
  );
}