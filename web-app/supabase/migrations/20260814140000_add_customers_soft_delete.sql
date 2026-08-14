-- Add soft-delete columns to customers.
-- See Database Design Document §7 (Soft Delete Strategy) and
-- Security & RBAC Design §5. Customer rows are never physically deleted;
-- they are hidden from listings while past references (sales, credit
-- payments) stay intact.

alter table public.customers
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users (id) on delete set null;

create index if not exists customers_soft_delete_idx
  on public.customers (deleted_at) where deleted_at is null;

-- A soft-deleted customer must be paid off before deletion, but a payment
-- against an already-deleted customer must also never be recorded. Refuse it
-- in the balance trigger so the DB invariant holds regardless of caller.
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

  if v_customer.deleted_at is not null then
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
      if v_customer.deleted_at is not null then
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