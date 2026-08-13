-- stock_history_with_details view: exposes each stock movement's product
-- name/SKU and the acting user's name to the REST API while keeping
-- cross-shop reads blocked.
--
-- Like users_with_email, this security-definer view runs as its owner
-- (postgres) for the products/users joins, but repeats the stock_history RLS
-- model ("Super Admin all, shop staff own shop") in a WHERE clause so the API
-- never leaks rows the caller may not read. See Security & RBAC §5.

create or replace view public.stock_history_with_details
as
select
  sh.id,
  sh.shop_id,
  sh.product_id,
  sh.change_type,
  sh.quantity_before,
  sh.quantity_changed,
  sh.quantity_after,
  sh.reference_id,
  sh.created_by,
  sh.created_at,
  p.name as product_name,
  p.sku as product_sku,
  u.full_name as created_by_name
from public.stock_history sh
left join public.products p on p.id = sh.product_id
left join public.users u on u.id = sh.created_by
where (
  auth.role() = 'service_role'
  or public.is_super_admin()
  or public.current_user_shop_id() = sh.shop_id
);

grant select on public.stock_history_with_details to authenticated, service_role;