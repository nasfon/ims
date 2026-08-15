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
