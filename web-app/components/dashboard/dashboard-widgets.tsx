"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Loader2,
  Package,
  PackageOpen,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";

import { CustomerForm } from "@/components/customers/customer-form";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ProductForm } from "@/components/products/product-form";
import { SaleForm } from "@/components/sales/sale-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogBackdrop,
  DialogPopup,
} from "@/components/ui/dialog";
import { useDashboard } from "@/hooks/use-dashboard";
import { ROLES, type RoleSlug } from "@/lib/roles";
import { cn, formatDateTime, formatNaira } from "@/lib/utils";
import type { RecentSale } from "@/types/dashboard";
import type { ShopOption } from "@/types/users";


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

type ActionId = "sale" | "product" | "customer" | "expense";

const QUICK_ACTIONS: {
  id: ActionId;
  label: string;
  description: string;
  icon: typeof Package;
  roles: RoleSlug[];
}[] = [
  {
    id: "sale",
    label: "New sale",
    description: "Ring up a sale",
    icon: ShoppingCart,
    roles: [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN, ROLES.CASHIER],
  },
  {
    id: "product",
    label: "Add product",
    description: "Create a new item",
    icon: Package,
    roles: [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN],
  },
  {
    id: "customer",
    label: "Add customer",
    description: "Register a customer",
    icon: Users,
    roles: [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN],
  },
  {
    id: "expense",
    label: "Record expense",
    description: "Log an outgoing cost",
    icon: Wallet,
    roles: [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN],
  },
];

const DIALOG_CLASS: Record<ActionId, string> = {
  sale: "max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto p-0",
  product: "max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto p-0",
  customer: "max-w-2xl overflow-y-auto p-0",
  expense: "max-w-lg overflow-y-auto p-0",
};

export function DashboardWidgets({
  actorRole,
  actorShopId,
  shops,
}: {
  actorRole: RoleSlug;
  actorShopId: string;
  /** null when the actor is a Shop Admin (no shop selector). */
  shops: ShopOption[] | null;
}) {
  const { data, isPending, error } = useDashboard();

  const quickActions = QUICK_ACTIONS.filter((action) =>
    action.roles.includes(actorRole),
  );

  const [activeAction, setActiveAction] = useState<ActionId | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function closeDialog() {
    setActiveAction(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {success ? (
        <div className="flex items-center justify-between rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            {success}
          </span>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <Dialog
        open={activeAction !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogBackdrop />
        <DialogPopup
          className={
            activeAction
              ? DIALOG_CLASS[activeAction]
              : "max-w-lg overflow-y-auto p-0"
          }
        >
          {activeAction === "sale" ? (
            <SaleForm
              actorShopId={actorShopId}
              shops={shops}
              onClose={closeDialog}
            />
          ) : null}
          {activeAction === "product" ? (
            <ProductForm
              mode="create"
              actorShopId={actorShopId}
              shops={shops}
              onClose={closeDialog}
            />
          ) : null}
          {activeAction === "customer" ? (
            <CustomerForm
              actorRole={actorRole}
              actorShopId={actorShopId}
              shops={shops}
              onClose={closeDialog}
            />
          ) : null}
          {activeAction === "expense" ? (
            <ExpenseForm
              mode="record"
              actorRole={actorRole}
              actorShopId={actorShopId}
              shops={shops}
              onClose={closeDialog}
              onSuccess={(message) => setSuccess(message)}
            />
          ) : null}
        </DialogPopup>
      </Dialog>

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
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      setSuccess(null);
                      setActiveAction(action.id);
                    }}
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
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}