-- Add products indexes and constraints.
-- See Database Design Document §5 (Indexes) and §6 (Constraints).

-- Indexes for search/ordering/filtering.
create index if not exists products_shop_id_idx on public.products (shop_id);
create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_is_active_idx on public.products (is_active)
  where is_active = true;

-- SKU must be unique within a shop (Database Design §5).
create unique index if not exists products_shop_id_sku_uq on public.products (shop_id, sku);

-- Constraints (Database Design §6):
--   quantity cannot be negative
--   selling price must be greater than zero
alter table public.products
  add constraint if not exists products_quantity_not_negative check (quantity >= 0),
  add constraint if not exists products_selling_price_gt_zero check (selling_price > 0);