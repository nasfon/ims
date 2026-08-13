import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — IMS",
};

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a module from the sidebar to get started.
      </p>
    </div>
  );
}