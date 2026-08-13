"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  products: "Products",
  customers: "Customers",
  sales: "Sales",
  "credit-book": "Credit Book",
  expenses: "Expenses",
  reports: "Reports",
  "audit-logs": "Audit Logs",
  shops: "Shops",
  users: "Users",
  settings: "Settings",
};

function segmentLabel(seg: string, prev: string | undefined, isLast: boolean): string | null {
  if (isLast && prev === "users") {
    if (seg === "new") return "New user";
    if (/^[0-9a-f-]{36}$/.test(seg)) return "Edit user";
  }
  return LABELS[seg] ?? null;
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: { label: string; href: string }[] = [];
  crumbs.push({ label: "Home", href: "/dashboard" });
  segments.forEach((seg, i) => {
    const isLast = i === segments.length - 1;
    const label = segmentLabel(seg, segments[i - 1], isLast);
    if (!label) return;
    crumbs.push({ label, href: `/${segments.slice(0, i + 1).join("/")}` });
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="size-3.5 text-muted-foreground" /> : null}
            {isLast ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}