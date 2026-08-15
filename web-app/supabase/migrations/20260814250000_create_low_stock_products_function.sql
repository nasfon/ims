-- Low-stock product lookup for the dashboard, stock, and products APIs.
--
-- PostgREST filters cannot compare two columns (e.g. `quantity <= minimum_stock`),
-- so low-stock is expressed as a set-returning function. It runs with invoker
-- security, so the products row-level policies still scope results to the
-- caller's shop (one shop for Shop Admin/Cashier, all shops for Super Admin).
-- Callers may filter further (is_active, search, range) on the returned rows.
--
-- See PRD §4.10 (Dashboard) and the Dashboard widget spec.

create or replace function public.low_stock_products()
returns setof public.products
language sql
stable
set search_path = public
as $$
  select p.*
  from public.products p
  where p.deleted_at is null
    and p.quantity <= p.minimum_stock;
$$;

grant execute on function public.low_stock_products() to authenticated, service_role;