"use client";

import Link from "next/link";
import { Banknote, Loader2, Phone } from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCustomerCredit,
  useCustomerSales,
} from "@/hooks/use-customers";
import { cn, formatNaira } from "@/lib/utils";
import type { CustomerItem } from "@/types/customers";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  pos: "POS",
};

const SALE_STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  corrected: "Corrected",
  reversed: "Reversed",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "danger" | "muted";
}) {
  return (
    <div className="rounded-lg border border-border px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 text-lg font-semibold",
          emphasis === "danger" && "text-destructive",
          emphasis === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function CustomerDetails({
  customerId,
  initial,
  canManage,
}: {
  customerId: string;
  initial: CustomerItem;
  canManage: boolean;
}) {
  const credit = useCustomerCredit(customerId);
  const sales = useCustomerSales(customerId, { page: 1, limit: 20 });

  const summary = credit.data?.summary;
  const payments = credit.data?.payments.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-muted">
            <Phone className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{initial.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              {initial.phone} · Added {formatDate(initial.created_at)}
            </p>
          </div>
        </div>
        {canManage ? (
          <Link
            href={`/credit-book?customer=${customerId}`}
            className={buttonVariants({ size: "sm" })}
          >
            <Banknote />
            Record payment
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Customer information</CardTitle>
            <CardDescription>Contact details for this customer.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <InfoRow label="Full name" value={initial.full_name} />
              <InfoRow label="Phone" value={initial.phone} />
              <InfoRow label="Email" value={initial.email || "—"} />
              <InfoRow label="Address" value={initial.address || "—"} />
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Outstanding credit</CardTitle>
            <CardDescription>Current balance and payment history.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {credit.isPending ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading credit…
              </p>
            ) : credit.error ? (
              <p className="text-sm text-destructive">{credit.error.message}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat
                  label="Outstanding"
                  value={formatNaira(summary?.outstanding ?? 0)}
                  emphasis={(summary?.outstanding ?? 0) > 0 ? "danger" : undefined}
                />
                <Stat label="Total paid" value={formatNaira(summary?.total_paid ?? 0)} />
                <Stat
                  label="Credit purchases"
                  value={formatNaira(summary?.total_purchased_on_credit ?? 0)}
                  emphasis="muted"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>Payments made toward this customer&apos;s credit.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {credit.isPending ? (
            <p className="p-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline size-4 animate-spin" />
              Loading payments…
            </p>
          ) : credit.error ? (
            <p className="p-6 text-sm text-destructive">{credit.error.message}</p>
          ) : payments.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.created_at)}</TableCell>
                    <TableCell>{paymentMethodLabel(payment.payment_method)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNaira(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchase history</CardTitle>
          <CardDescription>Sales made to this customer.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sales.isPending ? (
            <p className="p-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline size-4 animate-spin" />
              Loading purchases…
            </p>
          ) : sales.error ? (
            <p className="p-6 text-sm text-muted-foreground">
              Purchase history is unavailable right now.{" "}
              <span className="text-destructive">{sales.error.message}</span>
            </p>
          ) : (sales.data?.items ?? []).length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No purchases yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment method</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sales.data?.items ?? []).map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.receipt_number}</TableCell>
                    <TableCell>{formatDate(sale.created_at)}</TableCell>
                    <TableCell>{paymentMethodLabel(sale.payment_method)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNaira(sale.total)}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}