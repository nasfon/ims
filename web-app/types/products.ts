export type ProductItem = {
  id: string;
  shop_id: string;
  name: string;
  sku: string;
  quantity: number;
  selling_price: number;
  minimum_stock: number;
  is_active: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductsResponse = {
  items: ProductItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type ProductSortField =
  | "name"
  | "sku"
  | "quantity"
  | "selling_price"
  | "minimum_stock"
  | "created_at";

export type ProductFormValues = {
  name: string;
  sku: string;
  quantity: number;
  selling_price: number;
  minimum_stock: number;
  is_active: boolean;
};
