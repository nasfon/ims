-- Create roles table and seed default roles.
-- See Database Design Document §3.2 and Security & RBAC Design §3.

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_name_unique unique (name)
);

-- updated_at trigger (shared helper, created idempotently)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists roles_set_updated_at on public.roles;
create trigger roles_set_updated_at
  before update on public.roles
  for each row
  execute function public.set_updated_at();

-- Seed default roles (idempotent).
insert into public.roles (name, slug) values
  ('Super Admin', 'super_admin'),
  ('Shop Admin', 'shop_admin'),
  ('Cashier', 'cashier')
on conflict (slug) do nothing;

-- RLS: readable by all authenticated users.
-- Writes will be restricted once the users table + RLS helpers exist (see Security & RBAC §5).
alter table public.roles enable row level security;

drop policy if exists "Roles are readable by all authenticated users" on public.roles;
create policy "Roles are readable by all authenticated users"
  on public.roles
  for select
  to authenticated
  using (true);

-- Grant access to Postgres roles.
grant select on public.roles to authenticated;
grant select, insert, update, delete on public.roles to service_role;