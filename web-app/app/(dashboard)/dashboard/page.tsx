import type { Metadata } from "next";

import { requireSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard — IMS",
};

export default async function DashboardPage() {
  const { user } = await requireSession();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back, {user.full_name}! Current role:{" "}
        {user.role_slug ? user.role_slug.replace("_", " ") : "unknown"} · Shop:{" "}
        {user.shop_name ?? "—"}
      </p>
    </div>
  );
}