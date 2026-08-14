-- Create sale_items table.
-- See Database Design Document §3.7 and Security & RBAC Design §5 (Sale Items).
--
-- Access is inherited through the parent sale (no shop_id column, §3.7);
-- RLS policies join to sales to scope by shop. Rows are written alongside the
-- sale by the server-side API (service_role).

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  total_price numeric(12, 2) not null,
  constraint sale_items_quantity_gt_zero check (quantity > 0),
  constraint sale_items_unit_price_not_negative check (unit_price >= 0),
  constraint sale_items_total_price_not_negative check (total_price >= 0)
);

-- Indexes (Database Design §5): items by sale, products by item.
create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);
create index if not exists sale_items_product_id_idx on public.sale_items (product_id);

-- RLS (Security §5): Sale Items inherit access from the parent sale.
-- Super Admin full access; Shop Admin CRUD; Cashier create-only (matrix §4),
-- scoped by the parent sale's shop_id.
alter table public.sale_items enable row level security;

drop policy if exists "Super admin full access to sale items" on public.sale_items;
create policy "Super admin full access to sale items"
  on public.sale_items
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Shop admins manage sale items in their shop" on public.sale_items;
create policy "Shop admins manage sale items in their shop"
  on public.sale_items
  for all
  to authenticated
  using (
    public.current_user_shop_id() = (
      select shop_id from public.sales where id = sale_items.sale_id
    )
    and public.current_user_role_slug() = 'shop_admin'
  )
  with check (
    public.current_user_shop_id() = (
      select shop_id from public.sales where id = sale_items.sale_id
    )
    and public.current_user_role_slug() = 'shop_admin'
  );

drop policy if exists "Cashiers create sale items in their shop" on public.sale_items;
create policy "Cashiers create sale items in their shop"
  on public.sale_items
  for insert
  to authenticated
  with check (
    public.current_user_shop_id() = (
      select shop_id from public.sales where id = sale_items.sale_id
    )
    and public.current_user_role_slug() = 'cashier'
  );

grant select, update on public.sale_items to authenticated;
grant select, insert, update, delete on public.sale_items to service_role;