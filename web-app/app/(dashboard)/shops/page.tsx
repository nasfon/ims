import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { requireSuperAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Shops — SAYYIF PREMIUM FLOUR MASTER LTD",
};

export default async function ShopsPage() {
  await requireSuperAdmin();
  return <ModulePlaceholder title="Shops" />;
}