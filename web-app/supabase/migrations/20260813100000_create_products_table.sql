-- Create products table.
-- See Database Design Document §3.4 and Security & RBAC Design §5 (Products).

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  sku text not null,
  quantity integer not null default 0,
  selling_price numeric(12, 2) not null,
  minimum_stock integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_not_blank check (btrim(name) <> ''),
  constraint products_sku_not_blank check (btrim(sku) <> '')
);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

-- RLS (Security §5): Super Admin full access across all shops;
-- Shop Admin/Cashier restricted to shop_id = auth user's shop.
-- Permission matrix (§4): Products — Shop Admin CRUD, Cashier R.
-- Writes for both go through server-side APIs (service_role) which
-- enforce the role check; authenticated write policies mirror the matrix.
alter table public.products enable row level security;

drop policy if exists "Super admin full access to products" on public.products;
create policy "Super admin full access to products"
  on public.products
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Shop admins manage products in their shop" on public.products;
create policy "Shop admins manage products in their shop"
  on public.products
  for all
  to authenticated
  using (
    public.current_user_shop_id() = shop_id
    and public.current_user_role_slug() = 'shop_admin'
  )
  with check (
    public.current_user_shop_id() = shop_id
    and public.current_user_role_slug() = 'shop_admin'
  );

drop policy if exists "Cashiers read products in their shop" on public.products;
create policy "Cashiers read products in their shop"
  on public.products
  for select
  to authenticated
  using (
    public.current_user_shop_id() = shop_id
    and public.current_user_role_slug() = 'cashier'
  );

grant select, update on public.products to authenticated;
grant select, insert, update, delete on public.products to service_role;