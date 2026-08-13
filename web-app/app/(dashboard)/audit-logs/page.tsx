import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { requireUserManager } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Audit Logs — IMS",
};

export default async function AuditLogsPage() {
  await requireUserManager();
  return <ModulePlaceholder title="Audit Logs" />;
}