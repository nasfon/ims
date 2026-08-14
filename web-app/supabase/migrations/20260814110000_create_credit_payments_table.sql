-- Create credit_payments table.
-- See Database Design Document §3.8 and Security & RBAC Design §5 (Credit Payments).
--
-- Tracks payments toward customer debt. RLS is scoped through the customer's
-- shop_id (no shop_id column, per §3.8); Cashier has no access (per §4 matrix).
--
-- Note: sale_id carries no FK yet — the sales table is created in Phase 4.
-- The FK will be added there. Index on sale_id is created now so that
-- migration only needs to add the constraint.

create table if not exists public.credit_payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  sale_id uuid not null,
  amount numeric(12, 2) not null,
  payment_method text not null,
  received_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint credit_payments_amount_gt_zero check (amount > 0),
  constraint credit_payments_payment_method_valid check (
    payment_method in ('cash', 'bank_transfer', 'pos')
  )
);

-- Indexes (Database Design §5): payment lookups by customer, by sale, and history.
create index if not exists credit_payments_customer_id_created_at_idx
  on public.credit_payments (customer_id, created_at desc);
create index if not exists credit_payments_sale_id_idx
  on public.credit_payments (sale_id);

-- RLS (Security §5): Super Admin full access across all shops;
-- Shop Admin CRUD restricted to the customer's shop. Cashier has no access.
alter table public.credit_payments enable row level security;

drop policy if exists "Super admin full access to credit payments" on public.credit_payments;
create policy "Super admin full access to credit payments"
  on public.credit_payments
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Shop admins manage credit payments in their shop" on public.credit_payments;
create policy "Shop admins manage credit payments in their shop"
  on public.credit_payments
  for all
  to authenticated
  using (
    public.current_user_shop_id() = (
      select shop_id from public.customers where id = credit_payments.customer_id
    )
    and public.current_user_role_slug() = 'shop_admin'
  )
  with check (
    public.current_user_shop_id() = (
      select shop_id from public.customers where id = credit_payments.customer_id
    )
    and public.current_user_role_slug() = 'shop_admin'
  );

grant select, update on public.credit_payments to authenticated;
grant select, insert, update, delete on public.credit_payments to service_role;