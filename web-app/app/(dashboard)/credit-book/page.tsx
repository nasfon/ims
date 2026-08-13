import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { requireUserManager } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Credit Book — IMS",
};

export default async function CreditBookPage() {
  await requireUserManager();
  return <ModulePlaceholder title="Credit Book" />;
}