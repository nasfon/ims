"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { useSession } from "@/components/auth/session-provider";
import { NAV_ITEMS } from "@/components/dashboard/nav-config";
import { cn } from "@/lib/utils";

export function DashboardSidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const { user } = useSession();

  const items = NAV_ITEMS.filter((item) =>
    user?.role_slug ? item.roles.includes(user.role_slug) : false,
  );

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-background transition-[transform,width] duration-200 ease-in-out md:translate-x-0 print:hidden",
          collapsed ? "md:w-16" : "md:w-64",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <span className={cn(collapsed && "md:hidden")}>SAYYIF</span>
            <span className={cn("hidden", collapsed && "md:inline")}>S</span>
          </Link>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
          <button
            type="button"
            className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3" aria-label="Sidebar">
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      collapsed && "md:justify-center md:px-0",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className={cn(collapsed && "md:hidden")}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 space-y-2 border-t border-border p-3">
          <p
            className={cn(
              "truncate px-3 text-xs text-muted-foreground",
              collapsed && "md:hidden",
            )}
          >
            {user?.shop_name ?? "No shop"}
          </p>
          <LogoutButton
            collapseLabel={collapsed}
            className={cn("w-full justify-start", collapsed && "md:justify-center")}
          />
        </div>
      </aside>
    </>
  );
}
