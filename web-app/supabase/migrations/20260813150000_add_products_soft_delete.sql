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