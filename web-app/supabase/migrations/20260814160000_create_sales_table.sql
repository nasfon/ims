-- Create sales table.
-- See Database Design Document §3.6 and Security & RBAC Design §5 (Sales).
--
-- Every sale belongs to one shop (Database Design §6). customer_id is nullable
-- for walk-in sales (no customer). receipt_number is unique within a shop; the
-- sequential numbering trigger is added in a dedicated migration.
--
-- credit_payments.sale_id finally gets its FK now that sales exists.

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  cashier_id uuid not null references public.users (id) on delete restrict,
  receipt_number text not null,
  subtotal numeric(12, 2) not null,
  discount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  amount_paid numeric(12, 2) not null default 0,
  remaining_credit numeric(12, 2) not null default 0,
  payment_method text not null,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_receipt_number_not_blank check (btrim(receipt_number) <> ''),
  constraint sales_subtotal_not_negative check (subtotal >= 0),
  constraint sales_discount_not_negative check (discount >= 0),
  constraint sales_total_not_negative check (total >= 0),
  constraint sales_amount_paid_not_negative check (amount_paid >= 0),
  constraint sales_remaining_credit_not_negative check (remaining_credit >= 0),
  constraint sales_discount_lte_subtotal check (discount <= subtotal),
  constraint sales_total_lte_subtotal check (total <= subtotal),
  constraint sales_remaining_credit_lte_total check (remaining_credit <= total),
  constraint sales_payment_method_valid check (
    payment_method in ('cash', 'bank_transfer', 'pos')
  ),
  constraint sales_status_valid check (
    status in ('completed', 'corrected', 'reversed')
  ),
  constraint sales_shop_receipt_unique unique (shop_id, receipt_number)
);

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
  before update on public.sales
  for each row
  execute function public.set_updated_at();

-- Indexes (Database Design §5): shop scoping, customer purchase history.
create index if not exists sales_shop_id_created_at_idx
  on public.sales (shop_id, created_at desc);
create index if not exists sales_customer_id_created_at_idx
  on public.sales (customer_id, created_at desc);

-- Wire credit_payments.sale_id to sales now that the table exists.
alter table public.credit_payments
  drop constraint if exists credit_payments_sale_id_fk;
alter table public.credit_payments
  add constraint credit_payments_sale_id_fk
  foreign key (sale_id) references public.sales (id) on delete set null;

-- RLS (Security §5): Sales grouped with Products/Customers —
-- Super Admin full access; Shop Admin CRUD; Cashier create-only (matrix §4),
-- restricted to shop_id. Writes for both go through server-side APIs
-- (service_role) which enforce the role check.
alter table public.sales enable row level security;

drop policy if exists "Super admin full access to sales" on public.sales;
create policy "Super admin full access to sales"
  on public.sales
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Shop admins manage sales in their shop" on public.sales;
create policy "Shop admins manage sales in their shop"
  on public.sales
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

drop policy if exists "Cashiers create sales in their shop" on public.sales;
create policy "Cashiers create sales in their shop"
  on public.sales
  for insert
  to authenticated
  with check (
    public.current_user_shop_id() = shop_id
    and public.current_user_role_slug() = 'cashier'
  );

grant select, update on public.sales to authenticated;
grant select, insert, update, delete on public.sales to service_role;