-- Sequential, per-shop receipt numbering trigger.
-- See Database Design Document §5/§6 ("Receipt Number must be unique") and
-- Risk Management R5 (duplicate/inconsistent receipt numbers).
--
-- A receipt_sequences counter table keeps a monotonically increasing number
-- per shop. The BEFORE INSERT trigger serializes inserts per shop (SELECT ...
-- FOR UPDATE on the counter row) so concurrent sales can never collide, and
-- writes a zero-padded receipt_number. The existing unique (shop_id,
-- receipt_number) constraint backstops it.

create table if not exists public.receipt_sequences (
  shop_id uuid primary key references public.shops (id) on delete cascade,
  last_number integer not null default 0
);

-- Backfill the counter from any sales that already exist so numbering
-- continues after this migration (fresh DBs simply start at 1).
insert into public.receipt_sequences (shop_id, last_number)
select
  shop_id,
  max(nullif(regexp_replace(receipt_number, '\D', '', 'g'), '')::integer)
from public.sales
where receipt_number ~ '[0-9]'
group by shop_id
on conflict (shop_id) do nothing;

create or replace function public.assign_receipt_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last integer;
begin
  -- An explicit receipt_number (e.g. imported data) is honored as-is;
  -- the unique constraint still protects against duplicates.
  if new.receipt_number is not null and btrim(new.receipt_number) <> '' then
    return new;
  end if;

  -- Serialize per shop so two concurrent sales cannot get the same number.
  insert into public.receipt_sequences (shop_id, last_number)
  values (new.shop_id, 0)
  on conflict (shop_id) do nothing;

  select last_number into v_last
  from public.receipt_sequences
  where shop_id = new.shop_id
  for update;

  v_last := coalesce(v_last, 0) + 1;

  update public.receipt_sequences
  set last_number = v_last
  where shop_id = new.shop_id;

  new.receipt_number := lpad(v_last::text, 6, '0');

  return new;
end;
$$;

drop trigger if exists sales_assign_receipt_number on public.sales;
create trigger sales_assign_receipt_number
  before insert on public.sales
  for each row
  execute function public.assign_receipt_number();