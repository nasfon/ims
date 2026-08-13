import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { requireUserManager } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Expenses — IMS",
};

export default async function ExpensesPage() {
  await requireUserManager();
  return <ModulePlaceholder title="Expenses" />;
}