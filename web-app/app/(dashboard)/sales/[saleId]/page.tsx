import type { Metadata } from "next";

import { QueryProvider } from "@/components/providers/query-provider";
import { SaleActions } from "@/components/sales/sale-actions";
import { SaleReceipt } from "@/components/sales/sale-receipt";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Sale Receipt — SAYYIF",
};

export default async function SaleDetailPage() {
  const { user } = await requireSession();
  const canManage =
    user.role_slug === ROLES.SUPER_ADMIN || user.role_slug === ROLES.SHOP_ADMIN;

  return (
    <div className="p-6 print:p-0">
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Sale receipt</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the receipt details, print it, or download it as a PDF.
        </p>
      </div>

      <div className="mx-auto max-w-2xl print:max-w-none">
        <QueryProvider>
          <SaleReceipt />
          <SaleActions canManage={canManage} />
        </QueryProvider>
      </div>
    </div>
  );
}