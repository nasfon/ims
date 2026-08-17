"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Loader2,
  Package,
  PackageOpen,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDashboard } from "@/hooks/use-dashboard";
import { ROLES, type RoleSlug } from "@/lib/roles";
import { cn, formatDateTime, formatNaira } from "@/lib/utils";
import type { RecentSale } from "@/types/dashboard";



const SALE_STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  corrected: "Corrected",
  reversed: "Reversed",
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent = "text-foreground",
}: {
  icon: typeof Package;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span
            className={cn(
              "font-heading text-2xl font-semibold tracking-tight",
              accent,
            )}
          >
            {value}
          </span>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

const QUICK_ACTIONS: {
  href: string;
  label: string;
  description: string;
  icon: typeof Package;
  roles: RoleSlug[];
}[] = [
  {
    href: "/sales/new",
    label: "New sale",
    description: "Ring up a sale",
    icon: ShoppingCart,
    roles: [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN, ROLES.CASHIER],
  },
  {
    href: "/products/new",
    label: "Add product",
    description: "Create a new item",
    icon: Package,
    roles: [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN],
  },
  {
    href: "/customers/new",
    label: "Add customer",
    description: "Register a customer",
    icon: Users,
    roles: [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN],
  },
  {
    href: "/expenses",
    label: "Record expense",
    description: "Log an outgoing cost",
    icon: Wallet,
    roles: [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN],
  },
];

export function DashboardWidgets({ actorRole }: { actorRole: RoleSlug }) {
  const { data, isPending, error } = useDashboard();

  const quickActions = QUICK_ACTIONS.filter((action) =>
    action.roles.includes(actorRole),
  );

  return (
    <div className="flex flex-col gap-6">
      {isPending ? (
        <div className="rounded-xl border border-border p-10 text-center text-muted-foreground">
          <Loader2 className="mr-2 inline size-4 animate-spin" />
          Loading dashboard…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border p-10 text-center text-destructive">
          {error.message}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={Package}
              label="Total products"
              value={String(data.total_products)}
            />
            <StatCard
              icon={Users}
              label="Total customers"
              value={String(data.total_customers)}
            />
            <StatCard
              icon={ReceiptText}
              label="Today's sales"
              value={String(data.today_sales)}
            />
            <StatCard
              icon={TrendingUp}
              label="Revenue today"
              value={formatNaira(data.revenue)}
            />
            <StatCard
              icon={Wallet}
              label="Outstanding credit"
              value={formatNaira(data.outstanding_credit)}
              accent={data.outstanding_credit > 0 ? "text-destructive" : "text-foreground"}
            />
            <StatCard
              icon={BookOpenText}
              label="Expenses today"
              value={formatNaira(data.expenses)}
            />
            <StatCard
              icon={PackageOpen}
              label="Low stock"
              value={String(data.low_stock)}
              accent={data.low_stock > 0 ? "text-amber-600" : "text-foreground"}
            />
            <StatCard icon={ReceiptText} label="Recent sales" value={String(data.recent_sales.length)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent sales</CardTitle>
                <CardDescription>Latest activity across the shop.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.recent_sales.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No sales yet today.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.recent_sales.map((sale: RecentSale) => (
                      <li key={sale.id}>
                        <Link
                          href={`/sales/${sale.id}`}
                          className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-muted/50"
                        >
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate font-medium">
                              {sale.receipt_number}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {sale.customer?.full_name ?? "Walk-in"} ·{" "}
                              {sale.cashier?.full_name ?? "—"} ·{" "}
                              {formatDateTime(sale.created_at)}
                            </span>
                          </div>
                          <div className="flex flex-none items-center gap-3">
                            <span className="font-medium">{formatNaira(sale.total)}</span>
                            <Badge
                              variant={
                                sale.status === "reversed"
                                  ? "destructive"
                                  : sale.status === "corrected"
                                    ? "secondary"
                                    : "default"
                              }
                            >
                              {SALE_STATUS_LABELS[sale.status] ?? sale.status}
                            </Badge>
                            <ArrowRight className="size-4 text-muted-foreground" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick actions</CardTitle>
                <CardDescription>Jump straight to a task.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "justify-start gap-3",
                    )}
                  >
                    <action.icon className="size-4 shrink-0 text-primary" />
                    <span className="flex flex-col items-start leading-tight">
                      <span>{action.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}