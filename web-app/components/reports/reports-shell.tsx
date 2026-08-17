"use client";

import {
  BarChart3,
  BookOpenText,
  Boxes,
  Download,
  Loader2,
  Printer,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useReport,
  type ReportData,
  type ReportType,
} from "@/hooks/use-reports";
import {
  PAYMENT_METHOD_LABELS,
  SALE_STATUS_LABELS,
} from "@/lib/receipt-pdf";
import { buildReportPdf } from "@/lib/report-pdf";
import { cn, formatDate, formatNaira } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type {
  CreditReport,
  ExpensesReport,
  InventoryReport,
  RevenueReport,
  SalesReport,
} from "@/types/reports";
import type { ShopOption } from "@/types/users";

const REPORT_TYPES: {
  value: ReportType;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "sales",
    label: "Sales report",
    description: "Individual sales with totals",
    icon: ReceiptText,
  },
  {
    value: "revenue",
    label: "Revenue report",
    description: "Daily revenue breakdown",
    icon: BarChart3,
  },
  {
    value: "expenses",
    label: "Expenses report",
    description: "Outgoing expenses",
    icon: Wallet,
  },
  {
    value: "credit",
    label: "Credit report",
    description: "Outstanding customer credit",
    icon: BookOpenText,
  },
  {
    value: "inventory",
    label: "Inventory report",
    description: "Stock levels and values",
    icon: Boxes,
  },
];

function todayInput(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function daysAgoInput(days: number): string {
  const d = new Date(Date.now() - days * 86400_000);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}



function SummaryCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className={cn(
            "font-heading text-xl font-semibold tracking-tight",
            accent ? "text-destructive" : "text-foreground",
          )}
        >
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

export function ReportsShell({
  shops,
}: {
  /** null when the actor is a Shop Admin (no shop selector). */
  shops: ShopOption[] | null;
}) {
  const [reportType, setReportType] = useState<ReportType>("sales");
  const [startDate, setStartDate] = useState(daysAgoInput(30));
  const [endDate, setEndDate] = useState(todayInput());
  const [shopId, setShopId] = useState("");
  const [generated, setGenerated] = useState(false);

  const params = {
    startDate,
    endDate,
    shopId,
  };

  const { data, isPending, error, refetch } = useReport(
    reportType,
    params,
    generated,
  );

  function handleGenerate() {
    setGenerated(true);
    refetch();
  }

  function handleDownload() {
    if (!data) return;
    const filename = `ims-${reportType}-report-${todayInput()}`;
    buildReportPdf(filename, filename.replaceAll("-", " "), reportType, data).save(`${filename}.pdf`);
  }

  const typeMeta = REPORT_TYPES.find((t) => t.value === reportType)!;

  return (
    <div className="flex flex-col gap-6">
      {/* Report type selector */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {REPORT_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setReportType(type.value)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
              reportType === type.value
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-foreground/20",
            )}
          >
            <type.icon className="size-5 text-primary" />
            <span className="font-medium">{type.label}</span>
            <span className="text-xs text-muted-foreground">{type.description}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="report-from">
            From
          </label>
          <Input
            id="report-from"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-auto"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="report-to">
            To
          </label>
          <Input
            id="report-to"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 w-auto"
          />
        </div>
        {shops ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Shop</span>
            <Select value={shopId} onValueChange={(v) => setShopId(v ?? "")}>
              <SelectTrigger className="h-9 w-auto min-w-44">
                <SelectValue placeholder="All shops" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All shops</SelectItem>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Button type="button" onClick={handleGenerate}>
          Generate
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.print()}
          disabled={!generated}
        >
          <Printer />
          Print
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownload}
          disabled={!data}
        >
          <Download />
          Download PDF
        </Button>
      </div>

      {/* Report body */}
      {!generated ? (
        <div className="rounded-xl border border-border p-10 text-center text-muted-foreground">
          Select a report type and date range, then press <span className="font-medium">Generate</span>.
        </div>
      ) : isPending ? (
        <div className="rounded-xl border border-border p-10 text-center text-muted-foreground">
          <Loader2 className="mr-2 inline size-4 animate-spin" />
          Generating {typeMeta.label.toLowerCase()}…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border p-10 text-center text-destructive">
          {error.message}
        </div>
      ) : data ? (
        <ReportView reportType={reportType} report={data} />
      ) : null}
    </div>
  );
}

function ReportView({
  reportType,
  report,
}: {
  reportType: ReportType;
  report: ReportData;
}) {
  switch (reportType) {
    case "sales":
      return <SalesReportView report={report as SalesReport} />;
    case "revenue":
      return <RevenueReportView report={report as RevenueReport} />;
    case "expenses":
      return <ExpensesReportView report={report as ExpensesReport} />;
    case "credit":
      return <CreditReportView report={report as CreditReport} />;
    case "inventory":
      return <InventoryReportView report={report as InventoryReport} />;
  }
}

function SalesReportView({ report }: { report: SalesReport }) {
  const summary = report.summary;
  return (
    <div className="flex flex-col gap-4 print:gap-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Sales" value={String(summary.total_sales)} />
        <SummaryCard label="Subtotal" value={formatNaira(summary.subtotal)} />
        <SummaryCard label="Discount" value={`- ${formatNaira(summary.discount)}`} />
        <SummaryCard label="Revenue" value={formatNaira(summary.revenue)} />
        <SummaryCard label="Amount paid" value={formatNaira(summary.amount_paid)} />
        <SummaryCard label="Remaining credit" value={formatNaira(summary.remaining_credit)} accent />
      </div>

      <Card>
        <CardHeader className="print:hidden">
          <CardTitle>Sales report</CardTitle>
          <CardDescription>{report.items.length} sales listed{report.truncated ? " (truncated)" : ""}.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.items.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.receipt_number}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(sale.created_at)}</TableCell>
                    <TableCell>{sale.customer_name ?? "Walk-in"}</TableCell>
                    <TableCell className="text-muted-foreground">{sale.cashier_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[sale.payment_method] ?? sale.payment_method}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {SALE_STATUS_LABELS[sale.status] ?? sale.status}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatNaira(sale.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RevenueReportView({ report }: { report: RevenueReport }) {
  const summary = report.summary;
  return (
    <div className="flex flex-col gap-4 print:gap-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Sales" value={String(summary.total_sales)} />
        <SummaryCard label="Subtotal" value={formatNaira(summary.subtotal)} />
        <SummaryCard label="Discount" value={`- ${formatNaira(summary.discount)}`} />
        <SummaryCard label="Revenue" value={formatNaira(summary.revenue)} />
        <SummaryCard label="Amount paid" value={formatNaira(summary.amount_paid)} />
      </div>

      <Card>
        <CardHeader className="print:hidden">
          <CardTitle>Revenue report</CardTitle>
          <CardDescription>Daily revenue across the selected range.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Amount paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.items.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="font-medium">{day.date}</TableCell>
                    <TableCell className="text-right">{day.sales}</TableCell>
                    <TableCell className="text-right">{formatNaira(day.subtotal)}</TableCell>
                    <TableCell className="text-right">{formatNaira(day.discount)}</TableCell>
                    <TableCell className="text-right font-medium">{formatNaira(day.revenue)}</TableCell>
                    <TableCell className="text-right">{formatNaira(day.amount_paid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExpensesReportView({ report }: { report: ExpensesReport }) {
  const summary = report.summary;
  return (
    <div className="flex flex-col gap-4 print:gap-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard label="Expenses" value={String(summary.count)} />
        <SummaryCard label="Total" value={formatNaira(summary.total)} />
      </div>

      <Card>
        <CardHeader className="print:hidden">
          <CardTitle>Expenses report</CardTitle>
          <CardDescription>{report.items.length} expenses listed{report.truncated ? " (truncated)" : ""}.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Recorded by</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.items.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-muted-foreground">{formatDate(expense.expense_date)}</TableCell>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell className="text-muted-foreground">{expense.recorded_by_name ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatNaira(expense.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreditReportView({ report }: { report: CreditReport }) {
  const summary = report.summary;
  return (
    <div className="flex flex-col gap-4 print:gap-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total outstanding" value={formatNaira(summary.total_outstanding)} accent />
        <SummaryCard label="Customers" value={String(summary.customers_with_credit)} />
        <SummaryCard label="Payments received" value={formatNaira(summary.payments_received)} />
        <SummaryCard label="Payment count" value={String(summary.payments_count)} />
      </div>

      <Card>
        <CardHeader className="print:hidden">
          <CardTitle>Credit report</CardTitle>
          <CardDescription>Customers with outstanding balances.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Outstanding credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.items.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.phone ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {formatNaira(customer.total_credit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InventoryReportView({ report }: { report: InventoryReport }) {
  const summary = report.summary;
  return (
    <div className="flex flex-col gap-4 print:gap-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Products" value={String(summary.total_products)} />
        <SummaryCard label="Total units" value={String(summary.total_units)} />
        <SummaryCard label="Low stock" value={String(summary.low_stock)} accent />
        <SummaryCard label="Stock value" value={formatNaira(summary.stock_value)} />
      </div>

      <Card>
        <CardHeader className="print:hidden">
          <CardTitle>Inventory report</CardTitle>
          <CardDescription>Current stock levels and values.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                    <TableCell className="text-right">{formatNaira(product.selling_price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatNaira(product.stock_value)}</TableCell>
                    <TableCell className="text-right">{product.minimum_stock}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.is_active ? "Active" : "Inactive"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}