import type { Metadata } from "next";

import { QueryProvider } from "@/components/providers/query-provider";
import { UserForm } from "@/components/users/user-form";
import { requireUserManager } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Add User — SAYYIF PREMIUM FLOUR MASTER LTD",
};

export default async function NewUserPage() {
  const { user } = await requireUserManager();
  const actorRole = user.role_slug ?? ROLES.CASHIER;

  const supabase = await createClient();
  let shops: { id: string; name: string }[] | null = null;
  if (actorRole === ROLES.SUPER_ADMIN) {
    const { data } = await supabase.from("shops").select("id, name").order("name");
    shops = data ?? [];
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Add user</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an account and assign a role and shop.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <QueryProvider>
          <UserForm
            mode="create"
            actorRole={actorRole}
            actorShopId={user.shop_id ?? ""}
            shops={shops}
          />
        </QueryProvider>
      </div>
    </div>
  );
}