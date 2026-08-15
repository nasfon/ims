import type { Sale, SaleItem, SaleSortField } from "@/types/sales";

export const SALE_SORT_FIELDS: readonly SaleSortField[] = [
  "receipt_number",
  "total",
  "payment_method",
  "status",
  "created_at",
];

export const DEFAULT_SALE_SORT: SaleSortField = "created_at";

/** Maps RPC error messages from correct_sale / reverse_sale to API responses. */
export function errorFromSaleMutation(message: string) {
  if (message.includes("sale_not_found")) {
    return { message: "Sale not found.", status: 404 };
  }
  if (message.includes("sale_not_correctable") || message.includes("sale_not_reversible")) {
    return { message: "This sale has already been corrected or reversed.", status: 409 };
  }
  if (message.includes("reason_required")) {
    return { message: "A reason is required.", status: 422 };
  }
  if (message.includes("credit_would_go_negative")) {
    return {
      message:
        "This change would make the customer's credit go negative. Settle the outstanding balance first.",
      status: 422,
    };
  }
  if (message.includes("product_not_found")) {
    return { message: "One or more products were not found.", status: 404 };
  }
  if (message.includes("insufficient_stock")) {
    return { message: "Insufficient stock for one or more items.", status: 409 };
  }
  if (message.includes("product_inactive")) {
    return { message: "One or more products are inactive.", status: 409 };
  }
  if (message.includes("duplicate_product")) {
    return { message: "Each product can only appear once.", status: 422 };
  }
  if (message.includes("invalid_item") || message.includes("empty_items")) {
    return { message: "Sale items are invalid.", status: 422 };
  }
  if (message.includes("invalid_discount")) {
    return { message: "Discount cannot exceed the subtotal.", status: 422 };
  }
  if (message.includes("amount_paid_exceeds_total")) {
    return { message: "Amount paid cannot exceed the sale total.", status: 422 };
  }
  if (message.includes("invalid_payment_method")) {
    return { message: "Invalid payment method.", status: 422 };
  }
  return null;
}

export const SALE_FIELDS =
  "id, shop_id, customer_id, cashier_id, receipt_number, subtotal, discount, total, amount_paid, remaining_credit, payment_method, status, created_at, updated_at";

/** Raw sale row from the DB (PostgREST returns numeric as a string). */
export type SaleRow = {
  id: string;
  shop_id: string;
  customer_id: string | null;
  cashier_id: string;
  receipt_number: string;
  subtotal: string;
  discount: string;
  total: string;
  amount_paid: string;
  remaining_credit: string;
  payment_method: string;
  status: Sale["status"];
  created_at: string;
  updated_at: string;
};

type Nested = Record<string, unknown>;

/** Maps a DB row to the API shape, coercing numerics and optional embeds. */
export function mapSaleRow(row: Nested): Sale {
  const items =
    (row.sale_items as Nested[] | undefined) ??
    (row.items as Nested[] | undefined) ??
    [];
  const customer = row.customer as Nested | null | undefined;
  const cashier = row.cashier as Nested | null | undefined;
  const shop = row.shop as Nested | null | undefined;
  return {
    id: row.id as string,
    shop_id: row.shop_id as string,
    customer_id: (row.customer_id as string | null) ?? null,
    cashier_id: row.cashier_id as string,
    receipt_number: row.receipt_number as string,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    amount_paid: Number(row.amount_paid),
    remaining_credit: Number(row.remaining_credit),
    payment_method: row.payment_method as string,
    status: row.status as Sale["status"],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    customer: customer
      ? {
          full_name: (customer.full_name as string | null) ?? null,
          phone: (customer.phone as string | null) ?? null,
        }
      : null,
    cashier: cashier
      ? { full_name: (cashier.full_name as string | null) ?? null }
      : null,
    shop: shop
      ? {
          name: (shop.name as string | null) ?? null,
          phone: (shop.phone as string | null) ?? null,
          email: (shop.email as string | null) ?? null,
          address: (shop.address as string | null) ?? null,
          receipt_footer: (shop.receipt_footer as string | null) ?? null,
        }
      : null,
    items: items.map((item) => {
      const product = item.product as Nested | null | undefined;
      return {
        id: item.id as string,
        product_id: item.product_id as string,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        product: product
          ? {
              name: (product.name as string | null) ?? null,
              sku: (product.sku as string | null) ?? null,
            }
          : null,
      } as SaleItem;
    }),
  };
}