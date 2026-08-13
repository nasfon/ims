-- users_with_email view: exposes each user's auth email + role + shop names to
-- the REST API while keeping cross-shop reads blocked.
--
-- Email lives in auth.users (password/auth by Supabase), which the PostgREST
-- roles cannot normally query. This security-definer view runs as its owner
-- (postgres) for the auth.users/roles/shops joins, but repeats the users RLS
-- model ("Super Admin all, others own shop or self") in a WHERE clause so the
-- API never leaks rows the caller may not read. See Security & RBAC §5-6.

create or replace view public.users_with_email
as
select
  u.id,
  u.shop_id,
  u.role_id,
  u.full_name,
  u.phone,
  u.is_active,
  u.last_login_at,
  u.deleted_at,
  u.deleted_by,
  u.created_at,
  u.updated_at,
  au.email,
  r.name as role_name,
  r.slug as role_slug,
  s.name as shop_name
from public.users u
left join auth.users au on au.id = u.id
left join public.roles r on r.id = u.role_id
left join public.shops s on s.id = u.shop_id
where (
  auth.role() = 'service_role'
  or public.is_super_admin()
  or (
    public.current_user_role_slug() = 'shop_admin'
    and public.current_user_shop_id() = u.shop_id
  )
  or u.id = auth.uid()
);

grant select on public.users_with_email to authenticated, service_role;