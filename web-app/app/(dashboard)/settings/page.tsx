import type { Metadata } from "next";

import { QueryProvider } from "@/components/providers/query-provider";
import { BusinessSettingsShell } from "@/components/settings/business-settings-shell";
import { requireUserManager } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings — IMS",
};

export default async function SettingsPage() {
  const { user } = await requireUserManager();
  const actorRole = user.role_slug ?? ROLES.SHOP_ADMIN;

  const supabase = await createClient();
  let shops: { id: string; name: string }[] | null = null;
  if (actorRole === ROLES.SUPER_ADMIN) {
    const { data } = await supabase.from("shops").select("id, name").order("name");
    shops = data ?? [];
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage business information, logo, contact details, and the receipt footer.
        </p>
      </div>

      <QueryProvider>
        <BusinessSettingsShell
          actorRole={actorRole}
          actorShopId={user.shop_id ?? ""}
          shops={shops}
        />
      </QueryProvider>
    </div>
  );
}