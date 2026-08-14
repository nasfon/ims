import type { Metadata } from "next";

import { CreditBook } from "@/components/credit/credit-book";
import { QueryProvider } from "@/components/providers/query-provider";
import { requireUserManager } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Credit Book — SAYYIF PREMIUM FLOUR MASTER LTD",
};

export default async function CreditBookPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  await requireUserManager();
  const { customer } = await searchParams;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Credit Book</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track customer balances and record payments.
        </p>
      </div>

      <QueryProvider>
        <CreditBook initialCustomerId={customer} />
      </QueryProvider>
    </div>
  );
}