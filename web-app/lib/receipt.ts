import "server-only";

import { escapeHtml } from "@/lib/escape-html";
import { buildReceiptPdf } from "@/lib/receipt-pdf";
import { mapSaleRow } from "@/lib/sales";
import type { SupabaseClient } from "@supabase/supabase-js";

const RECEIPT_SELECT =
  "*, sale_items(*, product:products(name, sku)), customer:customers(full_name, phone), cashier:users(full_name), shop:shops(name, phone, email, address, receipt_footer)";

/** Loads a single sale with the embeds a receipt needs (RLS-scoped). */
export async function loadReceiptSale(
  supabase: SupabaseClient,
  saleId: string,
): Promise<{ sale?: ReturnType<typeof mapSaleRow>; error?: string }> {
  const { data, error } = await supabase
    .from("sales")
    .select(RECEIPT_SELECT)
    .eq("id", saleId)
    .single();

  if (error || !data) {
    return { error: "Sale not found." };
  }

  return { sale: mapSaleRow(data as Record<string, unknown>) };
}

function line(label: string, value: string): string {
  return `<tr><td>${escapeHtml(label)}</td><td class="right">${escapeHtml(value)}</td></tr>`;
}

/** Standalone printable HTML receipt (PRD §4.7). */
export function renderReceiptHtml(
  sale: NonNullable<Awaited<ReturnType<typeof loadReceiptSale>>["sale"]>,
): string {
  const money = (n: number) => `&#8358;${n.toLocaleString("en-NG")}`;
  const rows = sale.items
    .map((item) => {
      const name = item.product?.name ?? "Product";
      const sku = item.product?.sku;
      return `<tr>
        <td>${escapeHtml(name)}${sku ? ` <span class="muted">(${escapeHtml(sku)})</span>` : ""}</td>
        <td class="center">${item.quantity}</td>
        <td class="right">${money(item.total_price)}</td>
      </tr>`;
    })
    .join("");

  const footerNotes = [sale.shop?.receipt_footer, "Thank you for your patronage!"]
    .filter(Boolean)
    .map((note) => `<p class="footer-note">${escapeHtml(note!)}</p>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Receipt ${escapeHtml(sale.receipt_number)}</title>
<style>
  body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; max-width: 80mm; margin: 0 auto; padding: 8mm; color: #111; font-size: 12px; }
  .center { text-align: center; }
  .shop-name { font-size: 16px; font-weight: 700; margin: 0; }
  .muted { color: #555; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 3px 0; vertical-align: top; }
  th { text-align: left; }
  .right { text-align: right; }
  th.right { text-align: right; }
  tbody th.center, .center { text-align: center; }
  .rule { border-bottom: 1px dashed #999; margin: 8px 0; }
  .totals td { padding: 2px 0; }
  .total-line { font-weight: 700; font-size: 13px; }
  .footer-note { text-align: center; margin: 4px 0; color: #444; }
  @page { size: 80mm auto; margin: 0; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1 class="shop-name center">${escapeHtml(sale.shop?.name ?? "SAYYIF")}</h1>
  ${sale.shop?.phone ? `<p class="center muted">${escapeHtml(sale.shop.phone)}</p>` : ""}
  ${sale.shop?.address ? `<p class="center muted">${escapeHtml(sale.shop.address)}</p>` : ""}
  ${sale.shop?.email ? `<p class="center muted">${escapeHtml(sale.shop.email)}</p>` : ""}

  <div class="rule"></div>

  <table>
    <tbody>
      ${line("Receipt:", sale.receipt_number)}
      ${line("Date:", new Date(sale.created_at).toLocaleString("en-NG"))}
      ${line("Customer:", sale.customer?.full_name ?? "Walk-in customer")}
      ${line("Cashier:", sale.cashier?.full_name ?? "—")}
      ${line("Payment:", sale.payment_method)}
      ${line("Status:", sale.status)}
    </tbody>
  </table>

  <div class="rule"></div>

  <table>
    <thead>
      <tr>
        <th>ITEM</th>
        <th class="right">QTY</th>
        <th class="right">TOTAL</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="rule"></div>

  <table class="totals">
    <tbody>
      ${line("Subtotal", money(sale.subtotal))}
      ${sale.discount > 0 ? line("Discount", `- ${money(sale.discount)}`) : ""}
      <tr class="total-line"><td>Total</td><td class="right">${money(sale.total)}</td></tr>
      ${line("Amount paid", money(sale.amount_paid))}
      ${sale.remaining_credit > 0 ? line("Remaining credit", money(sale.remaining_credit)) : ""}
    </tbody>
  </table>

  <div class="rule"></div>

  ${footerNotes}
</body>
</html>`;
}

/** Renders the receipt as PDF bytes. */
export function renderReceiptPdf(
  sale: NonNullable<Awaited<ReturnType<typeof loadReceiptSale>>["sale"]>,
): ArrayBuffer {
  return buildReceiptPdf(sale).output("arraybuffer");
}
