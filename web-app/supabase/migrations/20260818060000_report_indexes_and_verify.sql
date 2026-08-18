-- Indexes tuned to the dashboard / report query patterns.
--
-- Super Admin queries sales/expenses with ONLY a date range (no shop_id
-- filter), so the existing (shop_id, created_at) composite is not used well.
-- Add standalone date indexes. The dashboard + revenue report also exclude
-- reversed sales, so a partial index narrows that hot path.
--
-- Also adds a temporary list_indexes() helper to verify indexes on remote;
-- removed in a follow-up migration.

create index if not exists sales_created_at_idx
  on public.sales (created_at desc);

create index if not exists sales_created_at_active_idx
  on public.sales (created_at desc)
  where status <> 'reversed';

create index if not exists expenses_expense_date_idx
  on public.expenses (expense_date desc);

create or replace function public.list_indexes()
returns table (tab text, idx text, definition text)
language sql
security definer
set search_path = public
as $$
  select (schemaname || '.' || tablename) as tab,
         indexname as idx,
         indexdef as definition
  from pg_indexes
  where schemaname = 'public'
  order by tab, idx
$$;
grant execute on function public.list_indexes() to service_role, authenticated;
