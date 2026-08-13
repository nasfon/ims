"use client";

import { Menu } from "lucide-react";

import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs";
import { UserMenu } from "@/components/dashboard/user-menu";

export function DashboardTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <DashboardBreadcrumbs />
      </div>
      <UserMenu />
    </header>
  );
}