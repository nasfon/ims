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