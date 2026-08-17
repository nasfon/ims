import type { Metadata } from "next";

import { QueryProvider } from "@/components/providers/query-provider";
import { ShopsTable } from "@/components/shops/shops-table";
import { requireSuperAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Shops — SAYYIF",
};

export default async function ShopsPage() {
  await requireSuperAdmin();

  return (
    <div className="p-6">
      <QueryProvider>
        <ShopsTable />
      </QueryProvider>
    </div>
  );
}
