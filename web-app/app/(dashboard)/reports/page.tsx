import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { requireUserManager } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Reports — IMS",
};

export default async function ReportsPage() {
  await requireUserManager();
  return <ModulePlaceholder title="Reports" />;
}