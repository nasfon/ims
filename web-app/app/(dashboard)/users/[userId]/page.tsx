import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { QueryProvider } from "@/components/providers/query-provider";
import { UserForm } from "@/components/users/user-form";
import { requireUserManager } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/validation/users";

export const metadata: Metadata = {
  title: "Edit User — SAYYIF PREMIUM FLOUR MASTER LTD",
};

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { user } = await requireUserManager();
  const actorRole = user.role_slug ?? ROLES.CASHIER;
  const { userId } = await params;

  if (!UUID_RE.test(userId)) {
    redirect("/users");
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("users_with_email")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();

  if (!target) notFound();

  // Shop Admins cannot manage Super Admin accounts (server-enforced in the API too).
  if (actorRole === ROLES.SHOP_ADMIN && target.role_slug === ROLES.SUPER_ADMIN) {
    redirect("/users");
  }

  let shops: { id: string; name: string }[] | null = null;
  if (actorRole === ROLES.SUPER_ADMIN) {
    const { data } = await supabase.from("shops").select("id, name").order("name");
    shops = data ?? [];
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Edit user</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update profile, role, and shop access for {target.full_name}.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <QueryProvider>
          <UserForm
            mode="edit"
            initial={target}
            actorRole={actorRole}
            actorShopId={user.shop_id ?? ""}
            shops={shops}
          />
        </QueryProvider>
      </div>
    </div>
  );
}