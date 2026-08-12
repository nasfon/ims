-- Create users table.
-- See Database Design Document §3.3, Security & RBAC Design §5-6, and UAT §3.3.
--
-- The public.users row links 1:1 to auth.users (id = auth.uid()). Passwords are
-- managed by Supabase Auth (Security §7); this table stores the profile + RBAC mapping.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete restrict,
  role_id uuid not null references public.roles (id) on delete restrict,
  full_name text not null,
  phone text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_full_name_not_blank check (btrim(full_name) <> '')
);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();

-- Indexes (Database Design §5): role_id, shop_id, created_at, soft-delete filtering.
create index if not exists users_shop_id_idx on public.users (shop_id);
create index if not exists users_role_id_idx on public.users (role_id);
create index if not exists users_created_at_idx on public.users (created_at desc);
create index if not exists users_active_idx on public.users (is_active) where deleted_at is null;

-- ------------------------------------------------------------------
-- RLS helper functions (Security & RBAC §6/§5): resolve the current
-- user's shop and role from the database (source of truth), so RLS
-- policies can compare row shop_id against the logged-in user's shop.
-- ------------------------------------------------------------------

drop function if exists public.current_user_shop_id();
create function public.current_user_shop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select shop_id
  from public.users
  where id = auth.uid() and deleted_at is null
$$;

drop function if exists public.current_user_role_id();
create function public.current_user_role_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select role_id
  from public.users
  where id = auth.uid() and deleted_at is null
$$;

drop function if exists public.is_super_admin();
create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.id = auth.uid()
      and u.deleted_at is null
      and r.slug = 'super_admin'
  )
$$;

-- ------------------------------------------------------------------
-- RLS policies on users.
-- Matrix (Security §4): Super Admin CRUD all; Shop Admin CRUD within
-- their own shop (roles limited to Shop Admin/Cashier); Cashier read only
-- their own profile.
-- ------------------------------------------------------------------

alter table public.users enable row level security;

-- Super Admin: full access to all rows.
drop policy if exists "Super admin full access to users" on public.users;
create policy "Super admin full access to users"
  on public.users
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Any authenticated user may read their own profile.
drop policy if exists "Users read own profile" on public.users;
create policy "Users read own profile"
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

-- Shop Admin manages users in their own shop only.
-- Note: role_id writes restricted to shop_admin/cashier (never super_admin).
drop policy if exists "Shop admins manage users in their shop" on public.users;
create policy "Shop admins manage users in their shop"
  on public.users
  for all
  to authenticated
  using (public.current_user_shop_id() = shop_id)
  with check (
    public.current_user_shop_id() = shop_id
    and exists (
      select 1 from public.roles
      where id = role_id and slug in ('shop_admin', 'cashier')
    )
  );

-- ------------------------------------------------------------------
-- Tighten the placeholder shops SELECT policy from the shops migration
-- to match Security §5: Super Admin sees all; Shop Admin/Cashier see
-- only their assigned shop.
-- ------------------------------------------------------------------

drop policy if exists "Users can view their own shop or all shops as admin" on public.shops;
create policy "Users can view their own shop or all shops as admin"
  on public.shops
  for select
  to authenticated
  using (public.is_super_admin() or id = public.current_user_shop_id());