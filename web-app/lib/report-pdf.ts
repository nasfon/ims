import { jsPDF } from "jspdf";

import type { ReportData, ReportType } from "@/hooks/use-reports";
import {
  PAYMENT_METHOD_LABELS,
  SALE_STATUS_LABELS,
} from "@/lib/receipt-pdf";
import type {
  CreditReport,
  ExpensesReport,
  InventoryReport,
  RevenueReport,
  SalesReport,
} from "@/types/reports";
import { formatNaira } from "@/lib/utils";

const WIDTH_MM = 210;
const MARGIN = 14;
const LINE_HEIGHT = 6;

type CssColor = [number, number, number];

function hexToRgb(hex: string): CssColor {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function formatReportDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type TableHead = { label: string; align?: "left" | "center" | "right" };
type TableRow = (string | number)[];

function drawTable(
  doc: jsPDF,
  heads: TableHead[],
  rows: TableRow[],
  startY: number,
): number {
  let y = startY;
  const colWidth = (WIDTH_MM - MARGIN * 2) / heads.length;

  const header = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setFillColor(...hexToRgb("#f4f4f5"));
    doc.rect(MARGIN, y - 4, WIDTH_MM - MARGIN * 2, 7, "F");
    heads.forEach((head, index) => {
      const align = head.align ?? "left";
      const x =
        align === "right"
          ? MARGIN + colWidth * (index + 1) - 2
          : MARGIN + colWidth * index + 2;
      doc.text(head.label, x, y, { align });
    });
    y += 6;
  };

  header();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  rows.forEach((row) => {
    if (y > 280) {
      doc.addPage("a4");
      y = 20;
      header();
    }
    row.forEach((value, index) => {
      const align = heads[index]?.align ?? "left";
      const x =
        align === "right"
          ? MARGIN + colWidth * (index + 1) - 2
          : MARGIN + colWidth * index + 2;
      doc.text(String(value), x, y, { align });
    });
    y += LINE_HEIGHT;
  });

  return y + 4;
}

/** Builds an A4 report as a jsPDF document. */
export function buildReportPdf(
  filename: string,
  title: string,
  reportType: ReportType,
  data: ReportData,
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const y0 = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, WIDTH_MM / 2, y0, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb("#71717a"));
  doc.text(
    `Generated ${new Date().toLocaleString("en-NG")}`,
    WIDTH_MM / 2,
    y0 + 5,
    { align: "center" },
  );

  const startY = y0 + 12;

  switch (reportType) {
    case "sales":
      void salesPdf(doc, data as SalesReport, startY);
      break;
    case "revenue":
      void revenuePdf(doc, data as RevenueReport, startY);
      break;
    case "expenses":
      void expensesPdf(doc, data as ExpensesReport, startY);
      break;
    case "credit":
      void creditPdf(doc, data as CreditReport, startY);
      break;
    case "inventory":
      void inventoryPdf(doc, data as InventoryReport, startY);
      break;
  }

  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb("#71717a"));
  doc.text(
    `${filename} — SAYYIF PREMIUM FLOUR MASTER LTD`,
    WIDTH_MM / 2,
    290,
    { align: "center" },
  );

  return doc;
}

function salesPdf(doc: jsPDF, report: SalesReport, startY: number): number {
  const s = report.summary;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Total sales: ${s.total_sales}   Revenue: ${formatNaira(s.revenue)}`,
    MARGIN,
    startY,
  );
  let y = startY + 6;
  doc.text(
    `Subtotal: ${formatNaira(s.subtotal)}   Discount: ${formatNaira(s.discount)}   Amount paid: ${formatNaira(s.amount_paid)}   Remaining credit: ${formatNaira(s.remaining_credit)}`,
    MARGIN,
    y,
  );
  y += 10;

  return drawTable(
    doc,
    [
      { label: "Receipt" },
      { label: "Date" },
      { label: "Customer" },
      { label: "Cashier" },
      { label: "Payment", align: "center" },
      { label: "Status", align: "center" },
      { label: "Total", align: "right" },
    ],
    report.items.map((item) => [
      item.receipt_number,
      formatReportDate(item.created_at),
      item.customer_name ?? "Walk-in",
      item.cashier_name ?? "—",
      PAYMENT_METHOD_LABELS[item.payment_method] ?? item.payment_method,
      SALE_STATUS_LABELS[item.status] ?? item.status,
      formatNaira(item.total),
    ]),
    y,
  );
}

function revenuePdf(doc: jsPDF, report: RevenueReport, startY: number): number {
  const s = report.summary;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Total sales: ${s.total_sales}   Revenue: ${formatNaira(s.revenue)}`,
    MARGIN,
    startY,
  );
  let y = startY + 6;
  doc.text(
    `Subtotal: ${formatNaira(s.subtotal)}   Discount: ${formatNaira(s.discount)}   Amount paid: ${formatNaira(s.amount_paid)}`,
    MARGIN,
    y,
  );
  y += 10;

  return drawTable(
    doc,
    [
      { label: "Date" },
      { label: "Sales", align: "right" },
      { label: "Subtotal", align: "right" },
      { label: "Discount", align: "right" },
      { label: "Revenue", align: "right" },
      { label: "Amount paid", align: "right" },
    ],
    report.items.map((item) => [
      item.date,
      String(item.sales),
      formatNaira(item.subtotal),
      formatNaira(item.discount),
      formatNaira(item.revenue),
      formatNaira(item.amount_paid),
    ]),
    y,
  );
}

function expensesPdf(
  doc: jsPDF,
  report: ExpensesReport,
  startY: number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Total expenses: ${report.summary.count}   Total: ${formatNaira(report.summary.total)}`,
    MARGIN,
    startY,
  );

  return drawTable(
    doc,
    [
      { label: "Date" },
      { label: "Description" },
      { label: "Recorded by" },
      { label: "Amount", align: "right" },
    ],
    report.items.map((item) => [
      formatReportDate(item.expense_date),
      item.description,
      item.recorded_by_name ?? "—",
      formatNaira(item.amount),
    ]),
    startY + 10,
  );
}

function creditPdf(doc: jsPDF, report: CreditReport, startY: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Total outstanding: ${formatNaira(report.summary.total_outstanding)}   Customers with credit: ${report.summary.customers_with_credit}`,
    MARGIN,
    startY,
  );
  const y = startY + 6;
  doc.text(
    `Payments received: ${formatNaira(report.summary.payments_received)} (${report.summary.payments_count})`,
    MARGIN,
    y,
  );

  return drawTable(
    doc,
    [
      { label: "Customer" },
      { label: "Phone" },
      { label: "Outstanding credit", align: "right" },
    ],
    report.items.map((item) => [
      item.full_name,
      item.phone ?? "—",
      formatNaira(item.total_credit),
    ]),
    y + 10,
  );
}

function inventoryPdf(
  doc: jsPDF,
  report: InventoryReport,
  startY: number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Total products: ${report.summary.total_products}   Total units: ${report.summary.total_units}`,
    MARGIN,
    startY,
  );
  const y = startY + 6;
  doc.text(
    `Low stock: ${report.summary.low_stock}   Stock value: ${formatNaira(report.summary.stock_value)}`,
    MARGIN,
    y,
  );

  return drawTable(
    doc,
    [
      { label: "Product" },
      { label: "SKU" },
      { label: "Qty", align: "center" },
      { label: "Price", align: "right" },
      { label: "Value", align: "right" },
      { label: "Min", align: "center" },
      { label: "Status", align: "center" },
    ],
    report.items.map((item) => [
      item.name,
      item.sku,
      String(item.quantity),
      formatNaira(item.selling_price),
      formatNaira(item.stock_value),
      String(item.minimum_stock),
      item.is_active ? "Active" : "Inactive",
    ]),
    y + 10,
  );
}