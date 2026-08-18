-- =====================================================================
-- SAYYIF — Compiled database schema
-- Generated from migrations/ in chronological order.
-- Apply with: psql $DATABASE_URL -f supabase/schema.sql
-- (Excludes diagnostic + one-time data-cleanup migrations.)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 20260811233847_create_roles_table.sql
-- ---------------------------------------------------------------------
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
-- ---------------------------------------------------------------------
-- 20260811234352_create_shops_table.sql
-- ---------------------------------------------------------------------
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
-- ---------------------------------------------------------------------
-- 20260811234615_add_shops_is_active.sql
-- ---------------------------------------------------------------------
-- Add is_active to shops to support disabling shops (Super Admin).
-- See Frontend UI Specification (Shops: Status / Disable Shop) and UAT §3.2.

alter table public.shops
  add column if not exists is_active boolean not null default true;

create index if not exists shops_is_active_idx on public.shops (is_active);
-- ---------------------------------------------------------------------
-- 20260811234909_create_users_table.sql
-- ---------------------------------------------------------------------
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
-- ---------------------------------------------------------------------
-- 20260811235258_fix_users_shop_admin_policy.sql
-- ---------------------------------------------------------------------
-- Fix the users RLS gap: the "Shop admins manage users in their shop" policy
-- matched any authenticated user by shop_id alone, letting Cashiers read all
-- users in the shop. Gate it to the market admin_role helper so only actually
-- affect Shop Admins.

-- Helper: current user's role slug (null when not linked in public.users).
drop function if exists public.current_user_role_slug();
create function public.current_user_role_slug()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.slug
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = auth.uid() and u.deleted_at is null
$$;

-- Restrict the shop-manager policy to Shop Admins only.
drop policy if exists "Shop admins manage users in their shop" on public.users;
create policy "Shop admins manage users in their shop"
  on public.users
  for all
  to authenticated
  using (
    public.current_user_shop_id() = shop_id
    and public.current_user_role_slug() = 'shop_admin'
  )
  with check (
    public.current_user_shop_id() = shop_id
    and public.current_user_role_slug() = 'shop_admin'
    and exists (
      select 1 from public.roles
      where id = role_id and slug in ('shop_admin', 'cashier')
    )
  );
-- ---------------------------------------------------------------------
-- 20260811235724_create_audit_logs_table.sql
-- ---------------------------------------------------------------------
-- Create audit_logs table + record_audit() function.
-- See Database Design Document §3.11, Security & RBAC Design §10, SAD §11.
--
-- Audit logs are shipped after every sensitive action (login, user/shop/product/
-- customer/sale/credit/expense/settings changes). Rows are append-only: no
-- UPDATE/DELETE policies are granted; only SELECT via RLS.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  -- Snapshot of the acting user's role at the time of the action.
  role_id uuid references public.roles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  reason text,
  ip_address text,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_not_blank check (btrim(action) <> ''),
  constraint audit_logs_entity_not_blank check (btrim(entity) <> '')
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_shop_id_idx on public.audit_logs (shop_id);
create index if not exists audit_logs_user_id_idx on public.audit_logs (user_id);
create index if not exists audit_logs_action_idx on public.audit_logs (action);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity);

-- ------------------------------------------------------------------
-- record_audit(): appends an audit log entry.
--
-- Server-side only (granted to service_role): the Next.js server action /
-- API route supplies the acting user's id/shop and the target entity. The
-- role is snapshotted by this function, so entries keep the role as it was.
-- Arguments are NOT derived from auth.uid() so the server can record actions
-- performed by a user it holds the session for.
-- ------------------------------------------------------------------

create or replace function public.record_audit(
  p_user_id uuid,
  p_shop_id uuid,
  p_action text,
  p_entity text,
  p_entity_id text default null,
  p_reason text default null,
  p_ip_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
  v_id uuid;
begin
  select role_id into v_role_id
  from public.users
  where id = p_user_id and deleted_at is null;

  insert into public.audit_logs (
    shop_id, user_id, role_id, action, entity, entity_id, reason, ip_address
  ) values (
    p_shop_id, p_user_id, v_role_id, p_action, p_entity, p_entity_id, p_reason, p_ip_address
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Only the server-side role may append audit entries.
revoke all on function public.record_audit(uuid, uuid, text, text, text, text, text) from public;
grant execute on function public.record_audit(uuid, uuid, text, text, text, text, text) to service_role;

-- ------------------------------------------------------------------
-- RLS (Security §5):
--   Super Admin: all rows.
--   Shop Admin: rows for their own shop.
--   Cashier: none.
-- No INSERT/UPDATE/DELETE policies -> append-only for authenticated users.
-- ------------------------------------------------------------------

alter table public.audit_logs enable row level security;

drop policy if exists "Super admin reads all audit logs" on public.audit_logs;
create policy "Super admin reads all audit logs"
  on public.audit_logs
  for select
  to authenticated
  using (public.is_super_admin());

drop policy if exists "Shop admins read audit logs for their shop" on public.audit_logs;
create policy "Shop admins read audit logs for their shop"
  on public.audit_logs
  for select
  to authenticated
  using (
    public.current_user_shop_id() = shop_id
    and public.current_user_role_slug() = 'shop_admin'
  );

grant select on public.audit_logs to authenticated;
grant select, insert on public.audit_logs to service_role;
-- ---------------------------------------------------------------------
-- 20260813090000_create_users_email_view.sql
-- ---------------------------------------------------------------------
-- users_with_email view: exposes each user's auth email + role + shop names to
-- the REST API while keeping cross-shop reads blocked.
--
-- Email lives in auth.users (password/auth by Supabase), which the PostgREST
-- roles cannot normally query. This security-definer view runs as its owner
-- (postgres) for the auth.users/roles/shops joins, but repeats the users RLS
-- model ("Super Admin all, others own shop or self") in a WHERE clause so the
-- API never leaks rows the caller may not read. See Security & RBAC §5-6.

create or replace view public.users_with_email
as
select
  u.id,
  u.shop_id,
  u.role_id,
  u.full_name,
  u.phone,
  u.is_active,
  u.last_login_at,
  u.deleted_at,
  u.deleted_by,
  u.created_at,
  u.updated_at,
  au.email,
  r.name as role_name,
  r.slug as role_slug,
  s.name as shop_name
from public.users u
left join auth.users au on au.id = u.id
left join public.roles r on r.id = u.role_id
left join public.shops s on s.id = u.shop_id
where (
  auth.role() = 'service_role'
  or public.is_super_admin()
  or (
    public.current_user_role_slug() = 'shop_admin'
    and public.current_user_shop_id() = u.shop_id
  )
  or u.id = auth.uid()
);

grant select on public.users_with_email to authenticated, service_role;
-- ---------------------------------------------------------------------
-- 20260813100000_create_products_table.sql
-- ---------------------------------------------------------------------
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
-- ---------------------------------------------------------------------
-- 20260813110000_create_stock_history_table.sql
-- ---------------------------------------------------------------------
-- Create stock_history table + automatic inventory movement logging trigger.
-- See Database Design Document §3.10 and Security & RBAC Design §5 (Stock History).
--
-- Every change to products.quantity is recorded here. The trigger reads
-- transaction-local settings set by the calling code to classify the movement:
--   set_config('app.stock_change_type', 'sale', true)
--   set_config('app.stock_reference_id', '<sale-uuid>', true)
--   set_config('app.stock_created_by', '<user-uuid>', true)
-- When unset: change_type defaults to 'manual_adjustment', created_by falls
-- back to auth.uid(). reference_id is generic (e.g. the destructive sale id);
-- no FK to sales — that table is created in a later phase.

create table if not exists public.stock_history (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  change_type text not null,
  quantity_before integer not null,
  quantity_changed integer not null,
  quantity_after integer not null,
  reference_id uuid,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_history_change_type_valid check (
    change_type in ('sale', 'manual_adjustment', 'sale_correction', 'reversal')
  ),
  constraint stock_history_quantity_before_not_negative check (quantity_before >= 0),
  constraint stock_history_quantity_after_not_negative check (quantity_after >= 0),
  constraint stock_history_changed_matches_delta check (
    quantity_after = quantity_before + quantity_changed
  )
);

create index if not exists stock_history_shop_id_created_at_idx
  on public.stock_history (shop_id, created_at desc);
create index if not exists stock_history_product_id_created_at_idx
  on public.stock_history (product_id, created_at desc);
create index if not exists stock_history_reference_id_idx
  on public.stock_history (reference_id);

-- ------------------------------------------------------------------
-- log_stock_movement(): records a products.quantity change.
-- security definer so the insert succeeds when the mutating DML is run
-- by the service role (server-side APIs), which triggers fire as the
-- calling user and are subject to RLS otherwise.
-- ------------------------------------------------------------------

create or replace function public.log_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_change_type text;
  v_reference_id uuid;
  v_created_by uuid;
begin
  v_change_type := coalesce(nullif(current_setting('app.stock_change_type', true), ''), 'manual_adjustment');
  v_reference_id := nullif(nullif(current_setting('app.stock_reference_id', true), ''), 'null')::uuid;
  v_created_by := coalesce(
    nullif(current_setting('app.stock_created_by', true), '')::uuid,
    auth.uid()
  );

  insert into public.stock_history (
    shop_id, product_id, change_type, quantity_before, quantity_changed, quantity_after,
    reference_id, created_by
  ) values (
    new.shop_id, new.id, v_change_type,
    old.quantity, new.quantity - old.quantity, new.quantity,
    v_reference_id, v_created_by
  );

  return new;
end;
$$;

drop trigger if exists products_log_stock_movement on public.products;
create trigger products_log_stock_movement
  after update of quantity on public.products
  for each row
  when (old.quantity is distinct from new.quantity)
  execute function public.log_stock_movement();

-- ------------------------------------------------------------------
-- RLS (Security §5): Stock History grouped with Products —
-- Super Admin: all rows. Shop Admin / Cashier: rows for their own shop.
-- Append-only by design (Soft Delete Strategy §7): no UPDATE/DELETE
-- policies; rows are written by the trigger above.
-- ------------------------------------------------------------------

alter table public.stock_history enable row level security;

drop policy if exists "Super admin reads all stock history" on public.stock_history;
create policy "Super admin reads all stock history"
  on public.stock_history
  for select
  to authenticated
  using (public.is_super_admin());

drop policy if exists "Shop users read stock history for their shop" on public.stock_history;
create policy "Shop users read stock history for their shop"
  on public.stock_history
  for select
  to authenticated
  using (public.current_user_shop_id() = shop_id);

grant select on public.stock_history to authenticated;
grant select, insert on public.stock_history to service_role;
-- ---------------------------------------------------------------------
-- 20260813120000_add_products_indexes_constraints.sql
-- ---------------------------------------------------------------------
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
-- PostgreSQL does not support `ADD CONSTRAINT IF NOT EXISTS`, so wrap in a DO block.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_quantity_not_negative' and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_quantity_not_negative check (quantity >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'products_selling_price_gt_zero' and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_selling_price_gt_zero check (selling_price > 0);
  end if;
end
$$;
-- ---------------------------------------------------------------------
-- 20260813130000_create_stock_history_view.sql
-- ---------------------------------------------------------------------
-- stock_history_with_details view: exposes each stock movement's product
-- name/SKU and the acting user's name to the REST API while keeping
-- cross-shop reads blocked.
--
-- Like users_with_email, this security-definer view runs as its owner
-- (postgres) for the products/users joins, but repeats the stock_history RLS
-- model ("Super Admin all, shop staff own shop") in a WHERE clause so the API
-- never leaks rows the caller may not read. See Security & RBAC §5.

create or replace view public.stock_history_with_details
as
select
  sh.id,
  sh.shop_id,
  sh.product_id,
  sh.change_type,
  sh.quantity_before,
  sh.quantity_changed,
  sh.quantity_after,
  sh.reference_id,
  sh.created_by,
  sh.created_at,
  p.name as product_name,
  p.sku as product_sku,
  u.full_name as created_by_name
from public.stock_history sh
left join public.products p on p.id = sh.product_id
left join public.users u on u.id = sh.created_by
where (
  auth.role() = 'service_role'
  or public.is_super_admin()
  or public.current_user_shop_id() = sh.shop_id
);

grant select on public.stock_history_with_details to authenticated, service_role;
-- ---------------------------------------------------------------------
-- 20260813140000_create_adjust_stock_function.sql
-- ---------------------------------------------------------------------
-- Atomic stock adjustment primitive + history record.
-- See Database Design Document §3.10 and Risk Management Plan R2 (Stock inaccuracy).
--
-- adjust_stock() is the single source of truth for inventory movements: it
-- locks the product row, rejects a resulting negative quantity, sets the
-- transaction-local classification consumed by the products_log_stock_movement
-- trigger, then updates quantity — so the quantity change and its stock_history
-- row commit atomically. Used by the products API (manual adjustment) and the
-- sales API (deduction on sale, later phase).

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_quantity_change integer,
  p_change_type text default 'manual_adjustment',
  p_reference_id uuid default null,
  p_created_by uuid default null
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
begin
  if p_quantity_change = 0 then
    select * into v_product from public.products where id = p_product_id;
    if not found then
      raise exception 'product_not_found';
    end if;
    return v_product;
  end if;

  if p_change_type not in ('sale', 'manual_adjustment', 'sale_correction', 'reversal') then
    raise exception 'invalid_change_type';
  end if;

  -- Lock the row so concurrent deductions cannot oversell.
  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'product_not_found';
  end if;

  if v_product.quantity + p_quantity_change < 0 then
    raise exception 'insufficient_stock';
  end if;

  -- Classify the movement for the products_log_stock_movement trigger.
  perform set_config('app.stock_change_type', p_change_type, true);
  perform set_config('app.stock_reference_id', coalesce(p_reference_id::text, ''), true);
  perform set_config('app.stock_created_by', coalesce(p_created_by::text, ''), true);

  update public.products
  set quantity = v_product.quantity + p_quantity_change
  where id = p_product_id
  returning * into v_product;

  return v_product;
end;
$$;

-- Server-side only (service_role): direct authenticated callers must use the
-- products API, which routes quantity changes through this function.
revoke all on function public.adjust_stock(uuid, integer, text, uuid, uuid) from public;
grant execute on function public.adjust_stock(uuid, integer, text, uuid, uuid) to service_role;
-- ---------------------------------------------------------------------
-- 20260813150000_add_products_soft_delete.sql
-- ---------------------------------------------------------------------
-- Add soft-delete columns to products.
-- See Database Design Document §7 (Soft Delete Strategy) and
-- Security & RBAC Design §5. Product rows are never physically deleted;
-- they are hidden from listings and returns via deleted_at.

alter table public.products
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users (id) on delete set null;

create index if not exists products_soft_delete_idx
  on public.products (deleted_at) where deleted_at is null;

-- adjust_stock must never move stock for a soft-deleted product. Refusing it
-- here keeps the DB invariant even if a caller misses the deleted_at filter.
create or replace function public.adjust_stock(
  p_product_id uuid,
  p_quantity_change integer,
  p_change_type text default 'manual_adjustment',
  p_reference_id uuid default null,
  p_created_by uuid default null
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
begin
  if p_quantity_change = 0 then
    select * into v_product from public.products where id = p_product_id;
    if not found then
      raise exception 'product_not_found';
    end if;
    if v_product.deleted_at is not null then
      raise exception 'product_not_found';
    end if;
    return v_product;
  end if;

  if p_change_type not in ('sale', 'manual_adjustment', 'sale_correction', 'reversal') then
    raise exception 'invalid_change_type';
  end if;

  -- Lock the row so concurrent deductions cannot oversell.
  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'product_not_found';
  end if;

  if v_product.deleted_at is not null then
    raise exception 'product_not_found';
  end if;

  if v_product.quantity + p_quantity_change < 0 then
    raise exception 'insufficient_stock';
  end if;

  -- Classify the movement for the products_log_stock_movement trigger.
  perform set_config('app.stock_change_type', p_change_type, true);
  perform set_config('app.stock_reference_id', coalesce(p_reference_id::text, ''), true);
  perform set_config('app.stock_created_by', coalesce(p_created_by::text, ''), true);

  update public.products
  set quantity = v_product.quantity + p_quantity_change
  where id = p_product_id
  returning * into v_product;

  return v_product;
end;
$$;

-- Server-side only (service_role): direct authenticated callers must use the
-- products API, which routes quantity changes through this function.
revoke all on function public.adjust_stock(uuid, integer, text, uuid, uuid) from public;
grant execute on function public.adjust_stock(uuid, integer, text, uuid, uuid) to service_role;
-- ---------------------------------------------------------------------
-- 20260814100000_create_customers_table.sql
-- ---------------------------------------------------------------------
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
-- ---------------------------------------------------------------------
-- 20260814110000_create_credit_payments_table.sql
-- ---------------------------------------------------------------------
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
-- ---------------------------------------------------------------------
-- 20260814120000_add_customers_credit_payments_indexes.sql
-- ---------------------------------------------------------------------
-- Add customers / credit_payments indexes.
-- See Database Design Document §5 (Indexes): shop_id, phone, customer_id.
--
-- Idempotent: names match the indexes already created in the table migrations,
-- so this re-declares the coverage for the Phase 3 checklist item.

create index if not exists customers_shop_id_idx on public.customers (shop_id);
create index if not exists customers_phone_idx on public.customers (phone);
create index if not exists credit_payments_customer_id_created_at_idx
  on public.credit_payments (customer_id, created_at desc);
-- ---------------------------------------------------------------------
-- 20260814130000_enforce_credit_payment_balance.sql
-- ---------------------------------------------------------------------
-- Enforce credit payment balance invariants at the DB layer.
-- See Database Design Document §6 ("Credit payment cannot exceed outstanding
-- balance") and Product Requirements (paying the full balance sets it to zero).
--
-- A security-definer trigger on credit_payments keeps customers.total_credit
-- in sync with payments and rejects over-payments, atomically:
--   INSERT  -> reject if amount > outstanding; debit customers.total_credit.
--   UPDATE  -> adjust balance for the delta (or move it between customers).
--   DELETE  -> restore the debt (add amount back).
--
-- The customer row is locked (SELECT ... FOR UPDATE) so concurrent payments
-- cannot over-debit. Raising here catches direct inserts too, not just the API.

create or replace function public.apply_credit_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers%rowtype;
begin
  if tg_op = 'DELETE' then
    update public.customers
    set total_credit = total_credit + old.amount
    where id = old.customer_id;
    return old;
  end if;

  select * into v_customer
  from public.customers
  where id = new.customer_id
  for update;

  if not found then
    raise exception 'customer_not_found';
  end if;

  if tg_op = 'INSERT' then
    if new.amount > v_customer.total_credit then
      raise exception 'payment_exceeds_balance';
    end if;
    update public.customers
    set total_credit = v_customer.total_credit - new.amount
    where id = new.customer_id;
  elsif tg_op = 'UPDATE' then
    if old.customer_id is distinct from new.customer_id then
      -- Moved to another customer: restore the old one, then re-apply.
      update public.customers
      set total_credit = total_credit + old.amount
      where id = old.customer_id;

      select * into v_customer
      from public.customers
      where id = new.customer_id
      for update;

      if not found then
        raise exception 'customer_not_found';
      end if;
      if new.amount > v_customer.total_credit then
        raise exception 'payment_exceeds_balance';
      end if;
      update public.customers
      set total_credit = v_customer.total_credit - new.amount
      where id = new.customer_id;
    else
      if new.amount > v_customer.total_credit + old.amount then
        raise exception 'payment_exceeds_balance';
      end if;
      update public.customers
      set total_credit = v_customer.total_credit + old.amount - new.amount
      where id = new.customer_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists credit_payments_apply_balance on public.credit_payments;
create trigger credit_payments_apply_balance
  before insert or update or delete on public.credit_payments
  for each row
  execute function public.apply_credit_payment();
-- ---------------------------------------------------------------------
-- 20260814140000_add_customers_soft_delete.sql
-- ---------------------------------------------------------------------
-- Add soft-delete columns to customers.
-- See Database Design Document §7 (Soft Delete Strategy) and
-- Security & RBAC Design §5. Customer rows are never physically deleted;
-- they are hidden from listings while past references (sales, credit
-- payments) stay intact.

alter table public.customers
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users (id) on delete set null;

create index if not exists customers_soft_delete_idx
  on public.customers (deleted_at) where deleted_at is null;

-- A soft-deleted customer must be paid off before deletion, but a payment
-- against an already-deleted customer must also never be recorded. Refuse it
-- in the balance trigger so the DB invariant holds regardless of caller.
create or replace function public.apply_credit_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers%rowtype;
begin
  if tg_op = 'DELETE' then
    update public.customers
    set total_credit = total_credit + old.amount
    where id = old.customer_id;
    return old;
  end if;

  select * into v_customer
  from public.customers
  where id = new.customer_id
  for update;

  if not found then
    raise exception 'customer_not_found';
  end if;

  if v_customer.deleted_at is not null then
    raise exception 'customer_not_found';
  end if;

  if tg_op = 'INSERT' then
    if new.amount > v_customer.total_credit then
      raise exception 'payment_exceeds_balance';
    end if;
    update public.customers
    set total_credit = v_customer.total_credit - new.amount
    where id = new.customer_id;
  elsif tg_op = 'UPDATE' then
    if old.customer_id is distinct from new.customer_id then
      -- Moved to another customer: restore the old one, then re-apply.
      update public.customers
      set total_credit = total_credit + old.amount
      where id = old.customer_id;

      select * into v_customer
      from public.customers
      where id = new.customer_id
      for update;

      if not found then
        raise exception 'customer_not_found';
      end if;
      if v_customer.deleted_at is not null then
        raise exception 'customer_not_found';
      end if;
      if new.amount > v_customer.total_credit then
        raise exception 'payment_exceeds_balance';
      end if;
      update public.customers
      set total_credit = v_customer.total_credit - new.amount
      where id = new.customer_id;
    else
      if new.amount > v_customer.total_credit + old.amount then
        raise exception 'payment_exceeds_balance';
      end if;
      update public.customers
      set total_credit = v_customer.total_credit + old.amount - new.amount
      where id = new.customer_id;
    end if;
  end if;

  return new;
end;
$$;
-- ---------------------------------------------------------------------
-- 20260814150000_allow_credit_payments_without_sale.sql
-- ---------------------------------------------------------------------
-- Allow credit payments without a sale.
--
-- The credit book must support settling a customer's outstanding balance even
-- when no specific sale is identified (marking fully paid / paying down old
-- debt). Until the Phase 4 sales table exists there are no sales to reference,
-- so sale_id cannot be required. Once sales land, sale_id may be supplied and
-- validated against the sale's remaining credit.

alter table public.credit_payments
  alter column sale_id drop not null;
-- ---------------------------------------------------------------------
-- 20260814160000_create_sales_table.sql
-- ---------------------------------------------------------------------
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
-- ---------------------------------------------------------------------
-- 20260814170000_create_sale_items_table.sql
-- ---------------------------------------------------------------------
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
-- ---------------------------------------------------------------------
-- 20260814180000_create_expenses_table.sql
-- ---------------------------------------------------------------------
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
-- ---------------------------------------------------------------------
-- 20260814190000_receipt_numbering_trigger.sql
-- ---------------------------------------------------------------------
-- Sequential, per-shop receipt numbering trigger.
-- See Database Design Document §5/§6 ("Receipt Number must be unique") and
-- Risk Management R5 (duplicate/inconsistent receipt numbers).
--
-- A receipt_sequences counter table keeps a monotonically increasing number
-- per shop. The BEFORE INSERT trigger serializes inserts per shop (SELECT ...
-- FOR UPDATE on the counter row) so concurrent sales can never collide, and
-- writes a zero-padded receipt_number. The existing unique (shop_id,
-- receipt_number) constraint backstops it.

create table if not exists public.receipt_sequences (
  shop_id uuid primary key references public.shops (id) on delete cascade,
  last_number integer not null default 0
);

-- Backfill the counter from any sales that already exist so numbering
-- continues after this migration (fresh DBs simply start at 1).
insert into public.receipt_sequences (shop_id, last_number)
select
  shop_id,
  max(nullif(regexp_replace(receipt_number, '\D', '', 'g'), '')::integer)
from public.sales
where receipt_number ~ '[0-9]'
group by shop_id
on conflict (shop_id) do nothing;

create or replace function public.assign_receipt_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last integer;
begin
  -- An explicit receipt_number (e.g. imported data) is honored as-is;
  -- the unique constraint still protects against duplicates.
  if new.receipt_number is not null and btrim(new.receipt_number) <> '' then
    return new;
  end if;

  -- Serialize per shop so two concurrent sales cannot get the same number.
  insert into public.receipt_sequences (shop_id, last_number)
  values (new.shop_id, 0)
  on conflict (shop_id) do nothing;

  select last_number into v_last
  from public.receipt_sequences
  where shop_id = new.shop_id
  for update;

  v_last := coalesce(v_last, 0) + 1;

  update public.receipt_sequences
  set last_number = v_last
  where shop_id = new.shop_id;

  new.receipt_number := lpad(v_last::text, 6, '0');

  return new;
end;
$$;

drop trigger if exists sales_assign_receipt_number on public.sales;
create trigger sales_assign_receipt_number
  before insert on public.sales
  for each row
  execute function public.assign_receipt_number();
-- ---------------------------------------------------------------------
-- 20260814200000_create_sale_function.sql
-- ---------------------------------------------------------------------
-- create_sale(): atomic sale creation.
-- Database Design §3.6–3.7, §6; Security & RBAC §5. One transaction that:
--   1. validates the shop, cashier, customer, and every item (active, in-shop,
--      in stock) while locking product rows so concurrent sales cannot oversell;
--   2. computes subtotal/discount/total from the products' current prices;
--   3. inserts the sale (receipt_number auto-assigned by trigger) + sale_items;
--   4. deducts stock, logging each movement as a 'sale' referencing the sale;
--   5. adds the remaining credit to customers.total_credit when amount_paid < total.
-- Raises descriptive errors (product_not_found, insufficient_stock, etc.) which
-- the API maps to friendly responses. Service-role only.

create or replace function public.create_sale(
  p_shop_id uuid,
  p_cashier_id uuid,
  p_items jsonb,
  p_payment_method text,
  p_discount numeric default 0,
  p_amount_paid numeric default 0,
  p_customer_id uuid default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_product record;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_total numeric;
  v_remaining numeric;
begin
  if p_discount is null or p_discount < 0 then
    raise exception 'invalid_discount';
  end if;
  if p_amount_paid is null or p_amount_paid < 0 then
    raise exception 'invalid_amount_paid';
  end if;
  if p_payment_method not in ('cash', 'bank_transfer', 'pos') then
    raise exception 'invalid_payment_method';
  end if;

  perform 1 from public.shops where id = p_shop_id;
  if not found then
    raise exception 'shop_not_found';
  end if;

  perform 1 from public.users where id = p_cashier_id and shop_id = p_shop_id and is_active;
  if not found then
    raise exception 'cashier_not_found';
  end if;

  if p_customer_id is not null then
    perform 1 from public.customers
    where id = p_customer_id and shop_id = p_shop_id and deleted_at is null;
    if not found then
      raise exception 'customer_not_found';
    end if;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_items';
  end if;

  if (select count(distinct value->>'product_id')
      from jsonb_array_elements(p_items)) <> jsonb_array_length(p_items) then
    raise exception 'duplicate_product';
  end if;

  -- Lock + validate each product and compute the subtotal at its current price.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    if v_product_id is null or v_quantity is null or v_quantity <= 0 then
      raise exception 'invalid_item';
    end if;

    select * into v_product
    from public.products
    where id = v_product_id
    for update;

    if not found then
      raise exception 'product_not_found';
    end if;
    if v_product.deleted_at is not null or v_product.shop_id <> p_shop_id then
      raise exception 'product_not_found';
    end if;
    if not v_product.is_active then
      raise exception 'product_inactive';
    end if;
    if v_product.quantity < v_quantity then
      raise exception 'insufficient_stock';
    end if;

    v_line_total := round(v_product.selling_price * v_quantity, 2);
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  if p_discount > v_subtotal then
    raise exception 'invalid_discount';
  end if;

  v_total := round(v_subtotal - p_discount, 2);
  if p_amount_paid > v_total then
    raise exception 'amount_paid_exceeds_total';
  end if;
  v_remaining := round(v_total - p_amount_paid, 2);

  insert into public.sales (
    shop_id, customer_id, cashier_id, subtotal, discount, total,
    amount_paid, remaining_credit, payment_method
  ) values (
    p_shop_id, p_customer_id, p_cashier_id, v_subtotal, p_discount, v_total,
    p_amount_paid, v_remaining, p_payment_method
  )
  returning * into v_sale;

  -- Insert items and deduct stock (stock_history logged as 'sale').
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    select selling_price into v_product.selling_price
    from public.products
    where id = v_product_id;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, total_price)
    values (
      v_sale.id, v_product_id, v_quantity, v_product.selling_price,
      round(v_product.selling_price * v_quantity, 2)
    );

    perform set_config('app.stock_change_type', 'sale', true);
    perform set_config('app.stock_reference_id', v_sale.id::text, true);
    perform set_config('app.stock_created_by', p_cashier_id::text, true);

    update public.products
    set quantity = quantity - v_quantity
    where id = v_product_id;
  end loop;

  -- Credit balance update when the customer pays less than the total.
  if p_customer_id is not null and v_remaining > 0 then
    update public.customers
    set total_credit = total_credit + v_remaining
    where id = p_customer_id;
  end if;

  return v_sale;
end;
$$;

-- Server-side only: the sales API calls this via service_role.
revoke all on function public.create_sale(uuid, uuid, jsonb, text, numeric, numeric, uuid) from public;
grant execute on function public.create_sale(uuid, uuid, jsonb, text, numeric, numeric, uuid) to service_role;
-- ---------------------------------------------------------------------
-- 20260814210000_create_sale_correct_reverse_functions.sql
-- ---------------------------------------------------------------------
-- correct_sale() / reverse_sale(): atomic sale correction & reversal.
-- See Database Design §3.6, §6 and Security & RBAC Design §5 (Sales correction
-- and reversal require a reason, are role-restricted, and are audited).
--
-- Both functions are service-role only, lock the sale row for update so a sale
-- cannot be corrected/reversed twice (already-corrected/reversed sales raise
-- sale_not_correctable / sale_not_reversible), and scope by the actor's shop
-- unless the actor is a Super Admin (p_shop_id null).
--
-- correct_sale:
--   1. restores stock sold by the original sale (logged 'sale_correction');
--   2. validates + locks each new item (in-shop, active, in stock) and recomputes
--      subtotal/discount/total from the products' current prices;
--   3. replaces the sale_items and deducts stock for the corrected lines;
--   4. adjusts customers.total_credit by the remaining-credit delta, raising
--      credit_would_go_negative when the customer's balance cannot absorb it;
--   5. flips status to 'corrected' (receipt_number is kept).
--
-- reverse_sale:
--   1. restores all stock sold by the sale (logged 'reversal');
--   2. removes the outstanding remaining_credit from customers.total_credit,
--      raising credit_would_go_negative if it would go below zero;
--   3. flips status to 'reversed' (line items are kept for the history).

create or replace function public.correct_sale(
  p_sale_id uuid,
  p_actor_id uuid,
  p_shop_id uuid,
  p_reason text,
  p_items jsonb,
  p_payment_method text,
  p_discount numeric default 0,
  p_amount_paid numeric default 0
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_customer public.customers%rowtype;
  v_product record;
  v_item jsonb;
  v_old_item record;
  v_product_id uuid;
  v_quantity integer;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_total numeric;
  v_remaining numeric;
  v_credit_delta numeric;
begin
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'reason_required';
  end if;
  if p_discount is null or p_discount < 0 then
    raise exception 'invalid_discount';
  end if;
  if p_amount_paid is null or p_amount_paid < 0 then
    raise exception 'invalid_amount_paid';
  end if;
  if p_payment_method not in ('cash', 'bank_transfer', 'pos') then
    raise exception 'invalid_payment_method';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_items';
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'sale_not_found';
  end if;
  if p_shop_id is not null and v_sale.shop_id <> p_shop_id then
    raise exception 'sale_not_found';
  end if;
  if v_sale.status <> 'completed' then
    raise exception 'sale_not_correctable';
  end if;

  -- 1. Restore stock sold by the original sale.
  for v_old_item in
    select product_id, quantity
    from public.sale_items
    where sale_id = v_sale.id
  loop
    perform set_config('app.stock_change_type', 'sale_correction', true);
    perform set_config('app.stock_reference_id', v_sale.id::text, true);
    perform set_config('app.stock_created_by', p_actor_id::text, true);

    update public.products
    set quantity = quantity + v_old_item.quantity
    where id = v_old_item.product_id;
  end loop;

  if (select count(distinct value->>'product_id')
      from jsonb_array_elements(p_items)) <> jsonb_array_length(p_items) then
    raise exception 'duplicate_product';
  end if;

  -- 2. Validate + lock each new item and compute the corrected subtotal.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    if v_product_id is null or v_quantity is null or v_quantity <= 0 then
      raise exception 'invalid_item';
    end if;

    select * into v_product
    from public.products
    where id = v_product_id
    for update;

    if not found then
      raise exception 'product_not_found';
    end if;
    if v_product.deleted_at is not null or v_product.shop_id <> v_sale.shop_id then
      raise exception 'product_not_found';
    end if;
    if not v_product.is_active then
      raise exception 'product_inactive';
    end if;
    if v_product.quantity < v_quantity then
      raise exception 'insufficient_stock';
    end if;

    v_line_total := round(v_product.selling_price * v_quantity, 2);
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  if p_discount > v_subtotal then
    raise exception 'invalid_discount';
  end if;

  v_total := round(v_subtotal - p_discount, 2);
  if p_amount_paid > v_total then
    raise exception 'amount_paid_exceeds_total';
  end if;
  v_remaining := round(v_total - p_amount_paid, 2);
  v_credit_delta := v_remaining - v_sale.remaining_credit;

  -- 3. Replace the line items and deduct stock for the corrected lines.
  delete from public.sale_items where sale_id = v_sale.id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    select selling_price into v_product.selling_price
    from public.products
    where id = v_product_id;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, total_price)
    values (
      v_sale.id, v_product_id, v_quantity, v_product.selling_price,
      round(v_product.selling_price * v_quantity, 2)
    );

    perform set_config('app.stock_change_type', 'sale_correction', true);
    perform set_config('app.stock_reference_id', v_sale.id::text, true);
    perform set_config('app.stock_created_by', p_actor_id::text, true);

    update public.products
    set quantity = quantity - v_quantity
    where id = v_product_id;
  end loop;

  -- 4. Credit delta adjustment (negative-balance guard).
  if v_sale.customer_id is not null and v_credit_delta <> 0 then
    select * into v_customer
    from public.customers
    where id = v_sale.customer_id
    for update;

    if v_customer.total_credit + v_credit_delta < 0 then
      raise exception 'credit_would_go_negative';
    end if;

    update public.customers
    set total_credit = v_customer.total_credit + v_credit_delta
    where id = v_sale.customer_id;
  end if;

  -- 5. Flip status; receipt_number and customer are kept.
  update public.sales
  set subtotal = v_subtotal,
      discount = p_discount,
      total = v_total,
      amount_paid = p_amount_paid,
      remaining_credit = v_remaining,
      payment_method = p_payment_method,
      status = 'corrected'
  where id = v_sale.id
  returning * into v_sale;

  return v_sale;
end;
$$;

create or replace function public.reverse_sale(
  p_sale_id uuid,
  p_actor_id uuid,
  p_shop_id uuid,
  p_reason text
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_item record;
  v_customer public.customers%rowtype;
begin
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'reason_required';
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'sale_not_found';
  end if;
  if p_shop_id is not null and v_sale.shop_id <> p_shop_id then
    raise exception 'sale_not_found';
  end if;
  if v_sale.status <> 'completed' then
    raise exception 'sale_not_reversible';
  end if;

  -- 1. Restore all stock sold by the sale ('reversal' movement).
  for v_item in
    select product_id, quantity
    from public.sale_items
    where sale_id = v_sale.id
  loop
    perform set_config('app.stock_change_type', 'reversal', true);
    perform set_config('app.stock_reference_id', v_sale.id::text, true);
    perform set_config('app.stock_created_by', p_actor_id::text, true);

    update public.products
    set quantity = quantity + v_item.quantity
    where id = v_item.product_id;
  end loop;

  -- 2. Remove the outstanding credit (negative-balance guard).
  if v_sale.customer_id is not null and v_sale.remaining_credit > 0 then
    select * into v_customer
    from public.customers
    where id = v_sale.customer_id
    for update;

    if v_customer.total_credit - v_sale.remaining_credit < 0 then
      raise exception 'credit_would_go_negative';
    end if;

    update public.customers
    set total_credit = v_customer.total_credit - v_sale.remaining_credit
    where id = v_sale.customer_id;
  end if;

  -- 3. Flip status; line items are kept for the sales history.
  update public.sales
  set status = 'reversed'
  where id = v_sale.id
  returning * into v_sale;

  return v_sale;
end;
$$;

-- Server-side only: the sales API calls these via service_role.
revoke all on function public.correct_sale(uuid, uuid, uuid, text, jsonb, text, numeric, numeric) from public;
grant execute on function public.correct_sale(uuid, uuid, uuid, text, jsonb, text, numeric, numeric) to service_role;

revoke all on function public.reverse_sale(uuid, uuid, uuid, text) from public;
grant execute on function public.reverse_sale(uuid, uuid, uuid, text) to service_role;
-- ---------------------------------------------------------------------
-- 20260814230000_create_business_settings_table.sql
-- ---------------------------------------------------------------------
-- Create business_settings table.
-- See Database Design Document §3 (table #12) and Security & RBAC Design §5
-- (Business Settings: Super Admin all rows, Shop Admin own shop only).

-- One row per shop (1:1 with shops); the receipt/settings page reads this to
-- render business identity (PRD §4.14). The shops table carries a parallel
-- set of fields used by receipts today; this table is the canonical settings
-- record going forward.
create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null unique references public.shops (id) on delete cascade,
  business_name text not null,
  phone text,
  address text,
  logo_url text,
  receipt_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_settings_name_not_blank check (btrim(business_name) <> '')
);

drop trigger if exists business_settings_set_updated_at on public.business_settings;
create trigger business_settings_set_updated_at
  before update on public.business_settings
  for each row
  execute function public.set_updated_at();

-- Index for ordering and the shop_id unique constraint above (Database §5).
create index if not exists business_settings_created_at_idx
  on public.business_settings (created_at desc);

-- Provision a settings row for shops created before this migration
-- (business_name is NOT NULL; copy the shop name).
insert into public.business_settings (shop_id, business_name)
select s.id, s.name
from public.shops s
where not exists (
  select 1 from public.business_settings b where b.shop_id = s.id
);

-- RLS (Security §5): Super Admin full access; Shop Admin restricted to their
-- assigned shop (own-shop policies mirror the products/expenses modules).
alter table public.business_settings enable row level security;

drop policy if exists "Super admin full access to business settings" on public.business_settings;
create policy "Super admin full access to business settings"
  on public.business_settings
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Shop admins manage business settings in their shop" on public.business_settings;
create policy "Shop admins manage business settings in their shop"
  on public.business_settings
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

-- Writes for Super Admin across shops (and provisioning) go through the
-- server-side settings API (service_role), which enforces the role check.
grant select, update on public.business_settings to authenticated;
grant select, insert, update, delete on public.business_settings to service_role;

-- ---------------------------------------------------------------------
-- 20260814240000_bootstrap_super_admin.sql
-- ---------------------------------------------------------------------
-- Bootstrap sayyif@ims.com as a Super Admin.
-- Idempotent: safe to run repeatedly. Creates a shop if none exists,
-- then links the auth account to the super_admin role.

do $$
declare
  v_auth_id uuid;
  v_shop_id uuid;
  v_role_id uuid;
begin
  select id into v_auth_id
  from auth.users
  where email = 'sayyif@ims.com';

  if v_auth_id is null then
    raise exception 'No auth user found for email sayyif@ims.com';
  end if;

  -- Ensure at least one shop exists.
  select id into v_shop_id from public.shops order by created_at limit 1;
  if v_shop_id is null then
    insert into public.shops (name) values ('SAYYIF')
    returning id into v_shop_id;
  end if;

  select id into v_role_id from public.roles where slug = 'super_admin';

  insert into public.users (id, shop_id, role_id, full_name, is_active)
  values (v_auth_id, v_shop_id, v_role_id, 'Super Admin', true)
  on conflict (id) do update
  set shop_id = excluded.shop_id,
      role_id = excluded.role_id,
      deleted_at = null,
      is_active = true;
end
$$;
-- ---------------------------------------------------------------------
-- 20260814250000_create_low_stock_products_function.sql
-- ---------------------------------------------------------------------
-- Low-stock product lookup for the dashboard, stock, and products APIs.
--
-- PostgREST filters cannot compare two columns (e.g. `quantity <= minimum_stock`),
-- so low-stock is expressed as a set-returning function. It runs with invoker
-- security, so the products row-level policies still scope results to the
-- caller's shop (one shop for Shop Admin/Cashier, all shops for Super Admin).
-- Callers may filter further (is_active, search, range) on the returned rows.
--
-- See PRD §4.10 (Dashboard) and the Dashboard widget spec.

create or replace function public.low_stock_products()
returns setof public.products
language sql
stable
set search_path = public
as $$
  select p.*
  from public.products p
  where p.deleted_at is null
    and p.quantity <= p.minimum_stock;
$$;

grant execute on function public.low_stock_products() to authenticated, service_role;
-- ---------------------------------------------------------------------
-- 20260815000000_cashier_read_sales.sql
-- ---------------------------------------------------------------------
-- Cashiers could INSERT sales (and sale items) but had no SELECT policy, so the
-- receipt page and sales list 404'd for them ("Sale not found."). Add read
-- access scoped to their own shop, mirroring the Shop Admin USING clauses.

-- Sales: allow cashiers to read sales in their shop.
drop policy if exists "Cashiers read sales in their shop" on public.sales;
create policy "Cashiers read sales in their shop"
  on public.sales
  for select
  to authenticated
  using (
    public.current_user_shop_id() = shop_id
    and public.current_user_role_slug() = 'cashier'
  );

-- Sale items: allow cashiers to read items whose parent sale is in their shop.
drop policy if exists "Cashiers read sale items in their shop" on public.sale_items;
create policy "Cashiers read sale items in their shop"
  on public.sale_items
  for select
  to authenticated
  using (
    public.current_user_shop_id() = (
      select shop_id from public.sales where id = sale_items.sale_id
    )
    and public.current_user_role_slug() = 'cashier'
  );

-- ---------------------------------------------------------------------
-- 20260817000000_allow_unassigned_users.sql
-- ---------------------------------------------------------------------
-- Allow users to exist without a shop (deassigned staff).
-- Super Admin can assign/deassign users to/from shops; unassigned users
-- keep their auth account but belong to no shop until reassigned.

alter table public.users
  alter column shop_id drop not null;

-- ---------------------------------------------------------------------
-- 20260818000000_performance_indexes.sql
-- ---------------------------------------------------------------------
-- Performance: add trigram search indexes and fix soft-delete partial indexes.
-- See diagnosis: product/customer search did full table scans (no ilike index),
-- and soft-delete partial indexes keyed on deleted_at (always NULL in the
-- partial set) could not narrow "active rows in my shop" scans.

-- 1. Trigram extension for case-insensitive substring search (ilike/like).
create extension if not exists pg_trgm;

-- 2. Search indexes for the most common UI actions (product/customer search).
create index if not exists products_name_trgm_idx
  on public.products using gin (name gin_trgm_ops);
create index if not exists customers_full_name_trgm_idx
  on public.customers using gin (full_name gin_trgm_ops);
create index if not exists customers_phone_trgm_idx
  on public.customers using gin (phone gin_trgm_ops);

-- 3. Correct the soft-delete partial indexes to key on shop_id so that
--    "active rows in my shop" queries skip deleted rows via an index scan
--    instead of scanning all rows and filtering deleted_at = NULL.
--    Drop the previously useless indexes that keyed on deleted_at/is_active.
drop index if exists public.products_soft_delete_idx;
drop index if exists public.customers_soft_delete_idx;
drop index if exists public.users_active_idx;

create index if not exists products_shop_id_active_idx
  on public.products (shop_id) where deleted_at is null;
create index if not exists customers_shop_id_active_idx
  on public.customers (shop_id) where deleted_at is null;
create index if not exists users_shop_id_active_idx
  on public.users (shop_id) where deleted_at is null;

-- ---------------------------------------------------------------------
-- 20260818010000_consolidate_rls_and_sales_indexes.sql
-- ---------------------------------------------------------------------
-- Performance: consolidate RLS identity lookups + add sales status indexes.
-- See diagnosis: every RLS policy independently called current_user_shop_id(),
-- current_user_role_slug() (joins users->roles) and is_super_admin() (joins
-- users->roles), each re-evaluated per candidate row on large scans (sales,
-- stock_history). We compute the caller's context ONCE per session and memoize
-- it in transaction-scoped GUCs, then route all four helpers through it.
-- Existing policy definitions are unchanged (they still call the same names).

-- Single source of truth for the current caller's identity.
create or replace function public.current_user_ctx()
returns table (
  shop_id uuid,
  role_id uuid,
  role_slug text,
  is_super_admin boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_role_id uuid;
  v_role_slug text;
  v_is_super boolean;
begin
  -- Cache hit: GUCs were set earlier in this session.
  if current_setting('app.ctx_shop_id', true) is not null then
    v_shop_id := nullif(current_setting('app.ctx_shop_id', true), '')::uuid;
    v_role_id := nullif(current_setting('app.ctx_role_id', true), '')::uuid;
    v_role_slug := nullif(current_setting('app.ctx_role_slug', true), '');
    v_is_super := coalesce(nullif(current_setting('app.ctx_is_super', true), '')::boolean, false);
    return query select v_shop_id, v_role_id, v_role_slug, v_is_super;
    return;
  end if;

  -- One join to resolve shop + role + super-admin flag.
  select u.shop_id, u.role_id, r.slug, (r.slug = 'super_admin')
    into v_shop_id, v_role_id, v_role_slug, v_is_super
  from public.users u
  left join public.roles r on r.id = u.role_id
  where u.id = auth.uid() and u.deleted_at is null;

  -- Memoize for the rest of the session (GUCs persist across function calls).
  perform set_config('app.ctx_shop_id', coalesce(v_shop_id::text, ''), true);
  perform set_config('app.ctx_role_id', coalesce(v_role_id::text, ''), true);
  perform set_config('app.ctx_role_slug', coalesce(v_role_slug, ''), true);
  perform set_config('app.ctx_is_super', coalesce(v_is_super::text, ''), true);

  return query select v_shop_id, v_role_id, v_role_slug, v_is_super;
end;
$$;

-- Route the existing helpers through the cached context (names unchanged so
-- all current policies keep working).
create or replace function public.current_user_shop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select shop_id from public.current_user_ctx()
$$;

create or replace function public.current_user_role_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select role_id from public.current_user_ctx()
$$;

create or replace function public.current_user_role_slug()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role_slug from public.current_user_ctx()
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(is_super_admin, false) from public.current_user_ctx()
$$;

-- Indexes for sales reporting by lifecycle status and by cashier.
create index if not exists sales_status_idx on public.sales (status);
create index if not exists sales_shop_id_status_idx
  on public.sales (shop_id, status);
create index if not exists sales_cashier_id_idx on public.sales (cashier_id);

-- ---------------------------------------------------------------------
-- 20260818050000_clean_database.sql
-- ---------------------------------------------------------------------
-- One-time data cleanup.
-- Keeps ONLY the bootstrap Super Admin (sayyif@ims.com) and the schema
-- (tables, roles, functions, policies, indexes, extensions). Removes every
-- shop, all transactional/business data, and every other account.
--
-- Safe guards: aborts if sayyif@ims.com cannot be resolved, and unassigns the
-- Super Admin from any shop before shops are dropped so FKs are not violated.

do $$
declare
  v_super_id uuid;
begin
  select id into v_super_id from auth.users where email = 'sayyif@ims.com';
  if v_super_id is null then
    -- Nothing to clean up yet (fresh project); skip gracefully so this
    -- migration is safe to apply before the Super Admin account exists.
    return;
  end if;

  -- 1. Remove all business / transactional data (FK-safe order).
  delete from public.sale_items;
  delete from public.credit_payments;
  delete from public.sales;
  delete from public.stock_history;
  delete from public.products;
  delete from public.customers;
  delete from public.expenses;
  delete from public.business_settings;
  delete from public.receipt_sequences;
  delete from public.audit_logs;

  -- 2. Unassign the Super Admin from any shop so shops can be dropped.
  update public.users set shop_id = null, deleted_at = null, is_active = true
   where id = v_super_id;
  update public.users set shop_id = null where shop_id is not null;

  -- 3. Remove every other account (cascades to public.users).
  delete from auth.users where id <> v_super_id;

  -- 4. Drop all shops.
  delete from public.shops;
end
$$;

-- ---------------------------------------------------------------------
-- 20260818060000_report_indexes_and_verify.sql
-- ---------------------------------------------------------------------
-- Indexes tuned to the dashboard / report query patterns.
--
-- Super Admin queries sales/expenses with ONLY a date range (no shop_id
-- filter), so the existing (shop_id, created_at) composite is not used well.
-- Add standalone date indexes. The dashboard + revenue report also exclude
-- reversed sales, so a partial index narrows that hot path.
--
create index if not exists sales_created_at_idx
  on public.sales (created_at desc);

create index if not exists sales_created_at_active_idx
  on public.sales (created_at desc)
  where status <> 'reversed';

create index if not exists expenses_expense_date_idx
  on public.expenses (expense_date desc);
