-- Create shops table.
-- See Database Design Document §3.1 and Security & RBAC Design §5 (Shops).

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  logo_url text,
  receipt_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shops_name_not_blank check (btrim(name) <> '')
);

drop trigger if exists shops_set_updated_at on public.shops;
create trigger shops_set_updated_at
  before update on public.shops
  for each row
  execute function public.set_updated_at();

-- Indexes for search/ordering (Database Design §5).
create index if not exists shops_name_idx on public.shops (name);
create index if not exists shops_created_at_idx on public.shops (created_at desc);

-- RLS: Shops are managed by Super Admin (full access).
-- Shop Admin / Cashier get SELECT for their assigned shop only.
-- The per-user shop/role helpers are created with the users table migration;
-- the SELECT policy below is tightened there. Until then, allow authenticated SELECT.
alter table public.shops enable row level security;

drop policy if exists "Users can view their own shop or all shops as admin" on public.shops;
create policy "Users can view their own shop or all shops as admin"
  on public.shops
  for select
  to authenticated
  using (true);

-- Writes (create/update/delete) go through server-side APIs (service_role),
-- which enforce the Super Admin role check. No authenticated write policies are granted.
grant select on public.shops to authenticated;
grant select, insert, update, delete on public.shops to service_role;