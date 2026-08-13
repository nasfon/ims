import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { requireUserManager } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings — IMS",
};

export default async function SettingsPage() {
  await requireUserManager();
  return <ModulePlaceholder title="Settings" />;
}