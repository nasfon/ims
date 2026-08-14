-- Enforce credit payment balance invariants at the DB layer.
-- See Database Design Document §6 ("Credit payment cannot exceed outstanding
-- balance") and Product Requirements (paying the full balance sets it to zero).
--
-- A security-definer trigger on credit_payments keeps customers.total_credit
-- in sync with payments and rejects over-payments, atomically:
--   INSERT  -> reject if amount > outstanding; debit customers.total_credit.
--   UPDATE  -> adjust balance for the delta (or move it between customers).
--   DELETE  -> restore the debt (add amount back).
--
-- The customer row is locked (SELECT ... FOR UPDATE) so concurrent payments
-- cannot over-debit. Raising here catches direct inserts too, not just the API.

create or replace function public.apply_credit_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers%rowtype;
begin
  if tg_op = 'DELETE' then
    update public.customers
    set total_credit = total_credit + old.amount
    where id = old.customer_id;
    return old;
  end if;

  select * into v_customer
  from public.customers
  where id = new.customer_id
  for update;

  if not found then
    raise exception 'customer_not_found';
  end if;

  if tg_op = 'INSERT' then
    if new.amount > v_customer.total_credit then
      raise exception 'payment_exceeds_balance';
    end if;
    update public.customers
    set total_credit = v_customer.total_credit - new.amount
    where id = new.customer_id;
  elsif tg_op = 'UPDATE' then
    if old.customer_id is distinct from new.customer_id then
      -- Moved to another customer: restore the old one, then re-apply.
      update public.customers
      set total_credit = total_credit + old.amount
      where id = old.customer_id;

      select * into v_customer
      from public.customers
      where id = new.customer_id
      for update;

      if not found then
        raise exception 'customer_not_found';
      end if;
      if new.amount > v_customer.total_credit then
        raise exception 'payment_exceeds_balance';
      end if;
      update public.customers
      set total_credit = v_customer.total_credit - new.amount
      where id = new.customer_id;
    else
      if new.amount > v_customer.total_credit + old.amount then
        raise exception 'payment_exceeds_balance';
      end if;
      update public.customers
      set total_credit = v_customer.total_credit + old.amount - new.amount
      where id = new.customer_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists credit_payments_apply_balance on public.credit_payments;
create trigger credit_payments_apply_balance
  before insert or update or delete on public.credit_payments
  for each row
  execute function public.apply_credit_payment();