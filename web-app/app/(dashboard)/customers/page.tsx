import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export const metadata: Metadata = {
  title: "Customers — IMS",
};

export default function CustomersPage() {
  return <ModulePlaceholder title="Customers" />;
}