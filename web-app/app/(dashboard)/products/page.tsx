import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export const metadata: Metadata = {
  title: "Products — IMS",
};

export default function ProductsPage() {
  return <ModulePlaceholder title="Products" />;
}