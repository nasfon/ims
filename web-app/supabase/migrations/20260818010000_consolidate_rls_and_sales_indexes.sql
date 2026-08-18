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
