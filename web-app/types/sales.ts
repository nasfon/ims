export type SaleItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product: { name: string | null; sku: string | null } | null;
};

export type SaleShop = {
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  receipt_footer: string | null;
};

export type Sale = {
  id: string;
  shop_id: string;
  customer_id: string | null;
  cashier_id: string;
  receipt_number: string;
  subtotal: number;
  discount: number;
  total: number;
  amount_paid: number;
  remaining_credit: number;
  payment_method: string;
  status: "completed" | "corrected" | "reversed";
  created_at: string;
  updated_at: string;
  customer: { full_name: string | null; phone: string | null } | null;
  cashier: { full_name: string | null } | null;
  shop: SaleShop | null;
  items: SaleItem[];
};

export type SalesResponse = {
  items: Sale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type SaleSortField =
  | "receipt_number"
  | "total"
  | "payment_method"
  | "status"
  | "created_at";

export type SaleLineInput = {
  product_id: string;
  quantity: number;
};

export type SaleFormValues = {
  shop_id?: string;
  customer_id?: string;
  discount: number;
  payment_method: string;
  amount_paid: number;
  items: SaleLineInput[];
};

export type SaleCorrectValues = {
  reason: string;
  discount: number;
  payment_method: string;
  amount_paid: number;
  items: SaleLineInput[];
};

export type SaleReasonValue = {
  reason: string;
};