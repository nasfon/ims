-- Fix the users RLS gap: the "Shop admins manage users in their shop" policy
-- matched any authenticated user by shop_id alone, letting Cashiers read all
-- users in the shop. Gate it to the market admin_role helper so only actually
-- affect Shop Admins.

-- Helper: current user's role slug (null when not linked in public.users).
drop function if exists public.current_user_role_slug();
create function public.current_user_role_slug()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.slug
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = auth.uid() and u.deleted_at is null
$$;

-- Restrict the shop-manager policy to Shop Admins only.
drop policy if exists "Shop admins manage users in their shop" on public.users;
create policy "Shop admins manage users in their shop"
  on public.users
  for all
  to authenticated
  using (
    public.current_user_shop_id() = shop_id
    and public.current_user_role_slug() = 'shop_admin'
  )
  with check (
    public.current_user_shop_id() = shop_id
    and public.current_user_role_slug() = 'shop_admin'
    and exists (
      select 1 from public.roles
      where id = role_id and slug in ('shop_admin', 'cashier')
    )
  );