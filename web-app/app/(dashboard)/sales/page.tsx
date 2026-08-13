import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export const metadata: Metadata = {
  title: "Sales — IMS",
};

export default function SalesPage() {
  return <ModulePlaceholder title="Sales" />;
}