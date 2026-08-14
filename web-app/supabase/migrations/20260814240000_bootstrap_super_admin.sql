-- Bootstrap sayyif@ims.com as a Super Admin.
-- Idempotent: safe to run repeatedly. Creates a shop if none exists,
-- then links the auth account to the super_admin role.

do $$
declare
  v_auth_id uuid;
  v_shop_id uuid;
  v_role_id uuid;
begin
  select id into v_auth_id
  from auth.users
  where email = 'sayyif@ims.com';

  if v_auth_id is null then
    raise exception 'No auth user found for email sayyif@ims.com';
  end if;

  -- Ensure at least one shop exists.
  select id into v_shop_id from public.shops order by created_at limit 1;
  if v_shop_id is null then
    insert into public.shops (name) values ('Main Shop')
    returning id into v_shop_id;
  end if;

  select id into v_role_id from public.roles where slug = 'super_admin';

  insert into public.users (id, shop_id, role_id, full_name, is_active)
  values (v_auth_id, v_shop_id, v_role_id, 'Super Admin', true)
  on conflict (id) do update
  set shop_id = excluded.shop_id,
      role_id = excluded.role_id,
      deleted_at = null,
      is_active = true;
end
$$;