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