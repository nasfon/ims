import type { Metadata } from "next";

import { QueryProvider } from "@/components/providers/query-provider";
import { UsersTable } from "@/components/users/users-table";
import { requireUserManager } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Users — SAYYIF",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const { user } = await requireUserManager();
  const sp = await searchParams;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage staff accounts and role assignments.
        </p>
      </div>

      {sp.created ? (
        <div className="mb-4 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {sp.created}
        </div>
      ) : null}

      <QueryProvider>
        <UsersTable currentUserId={user.id} />
      </QueryProvider>
    </div>
  );
}