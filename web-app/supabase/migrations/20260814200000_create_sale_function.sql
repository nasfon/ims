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