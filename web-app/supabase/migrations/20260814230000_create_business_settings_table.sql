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
