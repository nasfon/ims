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