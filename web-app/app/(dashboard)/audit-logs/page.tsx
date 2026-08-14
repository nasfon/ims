import type { Metadata } from "next";

import { AuditLogsTable } from "@/components/audit-logs/audit-logs-table";
import { QueryProvider } from "@/components/providers/query-provider";
import { requireUserManager } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Audit Logs — SAYYIF PREMIUM FLOUR MASTER LTD",
};

export default async function AuditLogsPage() {
  await requireUserManager();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track user actions across the system.
        </p>
      </div>

      <QueryProvider>
        <AuditLogsTable />
      </QueryProvider>
    </div>
  );
}