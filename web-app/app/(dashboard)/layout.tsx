import type { ReactNode } from "react";

import { SessionProvider } from "@/components/auth/session-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession();

  return (
    <SessionProvider user={session.user}>
      <DashboardShell>{children}</DashboardShell>
    </SessionProvider>
  );
}