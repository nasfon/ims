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
