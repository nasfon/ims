import { jsPDF } from "jspdf";

import { formatNaira } from "@/lib/utils";
import type { Sale } from "@/types/sales";

export const SALE_STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  corrected: "Corrected",
  reversed: "Reversed",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  pos: "POS",
};

export function formatReceiptDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatReceiptTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function saleStatusLabel(status: Sale["status"]): string {
  return SALE_STATUS_LABELS[status] ?? status;
}

const WIDTH_MM = 80;
const PAGE_HEIGHT_MM = 200;

/** Builds an 80mm-style receipt as a jsPDF document (PRD §4.7 fields). */
export function buildReceiptPdf(sale: Sale): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: [WIDTH_MM, PAGE_HEIGHT_MM] });
  const margin = 8;
  const lineHeight = 4.5;
  let y = 12;

  const center = (text: string, size = 10, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(text, WIDTH_MM / 2, y, { align: "center" });
    y += size * 0.4;
  };

  const row = (label: string, value: string, size = 9, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(label, margin, y);
    doc.text(value, WIDTH_MM - margin, y, { align: "right" });
    y += lineHeight;
  };

  const rule = () => {
    doc.setDrawColor(180);
    doc.line(margin, y, WIDTH_MM - margin, y);
    y += 2;
  };

  // Header: business identity + shop info.
  center(sale.shop?.name ?? "SAYYIF", 12, true);
  if (sale.shop?.phone) center(sale.shop.phone, 9);
  if (sale.shop?.address) center(sale.shop.address, 9);
  if (sale.shop?.email) center(sale.shop.email, 9);

  y += 2;
  rule();
  y += 2;

  row("Receipt:", sale.receipt_number);
  row(
    "Date:",
    `${formatReceiptDate(sale.created_at)} ${formatReceiptTime(sale.created_at)}`,
  );
  row("Customer:", sale.customer?.full_name ?? "Walk-in customer");
  row("Cashier:", sale.cashier?.full_name ?? "—");
  row("Payment:", paymentMethodLabel(sale.payment_method));
  row("Status:", saleStatusLabel(sale.status));

  y += 2;
  rule();
  y += 2;

  // Items.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ITEM", margin, y);
  doc.text("QTY", WIDTH_MM - margin - 32, y);
  doc.text("TOTAL", WIDTH_MM - margin, y, { align: "right" });
  y += lineHeight;

  sale.items.forEach((item) => {
    if (y > 188) {
      doc.addPage([WIDTH_MM, PAGE_HEIGHT_MM]);
      y = 12;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(item.product?.name ?? "Product", margin, y);
    doc.text(String(item.quantity), WIDTH_MM - margin - 32, y);
    doc.text(formatNaira(item.total_price), WIDTH_MM - margin, y, { align: "right" });
    y += lineHeight;
    if (item.product?.sku) {
      doc.setFontSize(7.5);
      doc.setTextColor(120);
      doc.text(item.product.sku, margin, y);
      doc.setTextColor(0);
      y += lineHeight * 0.8;
    }
  });

  y += 2;
  rule();
  y += 1;

  row("Subtotal", formatNaira(sale.subtotal));
  if (sale.discount > 0) row("Discount", `- ${formatNaira(sale.discount)}`);
  row("Total", formatNaira(sale.total), 10, true);
  row("Amount paid", formatNaira(sale.amount_paid));
  if (sale.remaining_credit > 0) {
    row("Remaining credit", formatNaira(sale.remaining_credit));
  }

  y += 4;
  if (sale.shop?.receipt_footer) {
    center(sale.shop.receipt_footer, 8);
  }
  center("Thank you for your patronage!", 8);

  return doc;
}
