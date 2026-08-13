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