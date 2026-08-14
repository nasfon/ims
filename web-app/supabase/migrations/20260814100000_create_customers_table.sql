-- Create customers table.
-- See Database Design Document §3.5 and Security & RBAC Design §5 (Customers).

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  address text,
  total_credit numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_full_name_not_blank check (btrim(full_name) <> ''),
  constraint customers_phone_not_blank check (btrim(phone) <> ''),
  constraint customers_total_credit_not_negative check (total_credit >= 0)
);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row
  execute function public.set_updated_at();

-- Indexes for search/ordering (Database Design §5): phone search and shop scoping.
create index if not exists customers_shop_id_idx on public.customers (shop_id);
create index if not exists customers_phone_idx on public.customers (phone);
create index if not exists customers_created_at_idx on public.customers (created_at desc);

-- RLS (Security §5): Customers grouped with Products —
-- Super Admin full access across all shops; Shop Admin CRUD and Cashier R,
-- both restricted to shop_id = auth user's shop.
alter table public.customers enable row level security;

drop policy if exists "Super admin full access to customers" on public.customers;
create policy "Super admin full access to customers"
  on public.customers
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Shop admins manage customers in their shop" on public.customers;
create policy "Shop admins manage customers in their shop"
  on public.customers
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

drop policy if exists "Cashiers read customers in their shop" on public.customers;
create policy "Cashiers read customers in their shop"
  on public.customers
  for select
  to authenticated
  using (
    public.current_user_shop_id() = shop_id
    and public.current_user_role_slug() = 'cashier'
  );

grant select, update on public.customers to authenticated;
grant select, insert, update, delete on public.customers to service_role;