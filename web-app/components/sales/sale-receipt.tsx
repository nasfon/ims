"use client";

import { useParams } from "next/navigation";
import { Download, Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSale } from "@/hooks/use-sales";
import {
  buildReceiptPdf,
  formatReceiptDate,
  formatReceiptTime,
  PAYMENT_METHOD_LABELS,
  SALE_STATUS_LABELS,
} from "@/lib/receipt-pdf";
import { cn, formatNaira } from "@/lib/utils";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

export function SaleReceipt() {
  const { saleId } = useParams<{ saleId: string }>();
  const { data: sale, isPending, error } = useSale(saleId);

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading receipt…
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error?.message ?? "Sale not found."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Sale {sale.receipt_number}</CardTitle>
          <CardDescription>
              {SALE_STATUS_LABELS[sale.status] ?? sale.status} ·{" "}
              {formatReceiptDate(sale.created_at)} at {formatReceiptTime(sale.created_at)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {/* Business + shop identity (receipt header). */}
          <div className="flex flex-col gap-0.5 border-b border-border pb-3">
            <div className="text-base font-semibold">
              {sale.shop?.name ?? "SAYYIF"}
            </div>
            {sale.shop?.phone ? (
              <div className="text-sm text-muted-foreground">{sale.shop.phone}</div>
            ) : null}
            {sale.shop?.address ? (
              <div className="text-sm text-muted-foreground">{sale.shop.address}</div>
            ) : null}
            {sale.shop?.email ? (
              <div className="text-sm text-muted-foreground">{sale.shop.email}</div>
            ) : null}
          </div>

          <dl className="flex flex-col">
            <Row label="Receipt number" value={sale.receipt_number} />
            <Row
              label="Date & time"
              value={`${formatReceiptDate(sale.created_at)} ${formatReceiptTime(sale.created_at)}`}
            />
            <Row
              label="Customer"
              value={sale.customer?.full_name ?? "Walk-in customer"}
            />
            <Row
              label="Cashier"
              value={sale.cashier?.full_name ?? "—"}
            />
            <Row
              label="Payment method"
              value={PAYMENT_METHOD_LABELS[sale.payment_method] ?? sale.payment_method}
            />
            <Row
              label="Status"
              value={
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    sale.status === "reversed"
                      ? "bg-destructive/10 text-destructive"
                      : sale.status === "corrected"
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-primary/10 text-primary",
                  )}
                >
                  {SALE_STATUS_LABELS[sale.status] ?? sale.status}
                </span>
              }
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-1.5 font-medium">Item</th>
                <th className="py-1.5 text-center font-medium">Qty</th>
                <th className="py-1.5 text-right font-medium">Price</th>
                <th className="py-1.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-2">
                    <div className="font-medium">
                      {item.product?.name ?? "Product"}
                    </div>
                  </td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{formatNaira(item.unit_price)}</td>
                  <td className="py-2 text-right font-medium">{formatNaira(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col gap-1 border-t border-border pt-3">
            <Row label="Subtotal" value={formatNaira(sale.subtotal)} />
            {sale.discount > 0 ? (
              <Row label="Discount" value={`- ${formatNaira(sale.discount)}`} />
            ) : null}
            <div className="flex items-start justify-between gap-4 py-1">
              <dt className="text-sm font-semibold">Total</dt>
              <dd className="text-right text-sm font-semibold">
                {formatNaira(sale.total)}
              </dd>
            </div>
            <Row label="Amount paid" value={formatNaira(sale.amount_paid)} />
            {sale.remaining_credit > 0 ? (
              <Row
                label="Remaining credit"
                value={
                  <span className="font-medium text-destructive">
                    {formatNaira(sale.remaining_credit)}
                  </span>
                }
              />
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button type="button" onClick={() => window.print()}>
          <Printer />
          Print receipt
        </Button>
        <Button type="button" variant="outline" onClick={() => downloadPdf(sale)}>
          <Download />
          Download PDF
        </Button>
      </div>
    </div>
  );
}

type PdfSale = NonNullable<ReturnType<typeof useSale>["data"]>;

/** Renders an 80mm-style receipt as a PDF using jsPDF. */
function downloadPdf(sale: PdfSale) {
  buildReceiptPdf(sale).save(`receipt-${sale.receipt_number}.pdf`);
}