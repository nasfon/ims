export type CustomerItem = {
  id: string;
  shop_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  total_credit: number;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomersResponse = {
  items: CustomerItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type CustomerSortField =
  | "full_name"
  | "phone"
  | "total_credit"
  | "created_at";

export type CustomerFormValues = {
  full_name: string;
  phone: string;
  email: string;
  address: string;
};

export type CreditPayment = {
  id: string;
  sale_id: string | null;
  amount: number;
  payment_method: string;
  received_by: string | null;
  created_at: string;
};

export type CreditSummary = {
  outstanding: number;
  total_paid: number;
  total_purchased_on_credit: number;
};

export type CreditPaymentRecordedResponse = {
  payment: { id: string; amount: number };
  total_credit: number;
};

export type CreditPaymentInput = {
  customerId: string;
  saleId?: string;
  amount: number;
  paymentMethod: string;
};

export type CustomerCreditResponse = {
  customer: CustomerItem;
  summary: CreditSummary;
  payments: {
    items: CreditPayment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
};

export type CustomerSaleItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type CustomerSale = {
  id: string;
  shop_id: string;
  customer_id: string;
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
  items: CustomerSaleItem[];
};

export type CustomerSalesResponse = {
  items: CustomerSale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};
