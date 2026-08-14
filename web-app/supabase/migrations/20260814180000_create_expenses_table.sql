-- Create expenses table.
-- See Database Design Document §3.9 and Security & RBAC Design §5 (Expenses).

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null,
  expense_date timestamptz not null default now(),
  recorded_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_description_not_blank check (btrim(description) <> ''),
  constraint expenses_amount_gt_zero check (amount > 0)
);

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row
  execute function public.set_updated_at();

-- Indexes (Database Design §5): shop scoping + date-range filtering.
create index if not exists expenses_shop_id_expense_date_idx
  on public.expenses (shop_id, expense_date desc);
create index if not exists expenses_shop_id_created_at_idx
  on public.expenses (shop_id, created_at desc);

-- RLS (Security §5): Expenses grouped with Products/Customers/Sales —
-- Super Admin full access; Shop Admin CRUD, both restricted to shop_id.
-- Cashier has no access (matrix §4).
alter table public.expenses enable row level security;

drop policy if exists "Super admin full access to expenses" on public.expenses;
create policy "Super admin full access to expenses"
  on public.expenses
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Shop admins manage expenses in their shop" on public.expenses;
create policy "Shop admins manage expenses in their shop"
  on public.expenses
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

grant select, update on public.expenses to authenticated;
grant select, insert, update, delete on public.expenses to service_role;