import type { NextRequest } from "next/server";

import { guardApiUser } from "@/lib/api";
import { loadReceiptSale, renderReceiptPdf } from "@/lib/receipt";
import { UUID_RE } from "@/lib/validation/sales";

/** GET /sales/{saleId}/receipt/pdf — downloadable 80mm PDF receipt (PRD §4.7). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const { saleId } = await params;
  if (!UUID_RE.test(saleId)) {
    return new Response("Invalid sale id.", { status: 400 });
  }

  const { sale, error: loadError } = await loadReceiptSale(session.supabase, saleId);
  if (loadError || !sale) {
    return new Response("Sale not found.", { status: 404 });
  }

  const buffer = renderReceiptPdf(sale);

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${sale.receipt_number}.pdf"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "no-store",
    },
  });
}