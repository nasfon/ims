import type { NextRequest } from "next/server";

import { guardApiUser } from "@/lib/api";
import { loadReceiptSale, renderReceiptHtml } from "@/lib/receipt";
import { UUID_RE } from "@/lib/validation/sales";

/** GET /sales/{saleId}/receipt — printable HTML receipt (PRD §4.7). */
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

  return new Response(renderReceiptHtml(sale), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
