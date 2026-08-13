-- IMS seed data
-- Loaded automatically by `supabase db reset` (see [db.seed] in supabase/config.toml).
-- Can also be applied to the linked project with: supabase db query --linked -f supabase/seed.sql
--
-- Seeds the initial Super Admin account.
--   Email:    admin@ims.app
--   Password: SuperAdmin1!
-- Change the password after first login (or edit it below before running the seed).

do $$
declare
  v_shop_id uuid;
  v_role_id uuid;
  v_user_id uuid;
begin
  -- Head office shop that the Super Admin belongs to.
  select id into v_shop_id from public.shops where name = 'Head Office (IMS)' limit 1;
  if v_shop_id is null then
    insert into public.shops (name, email)
    values ('Head Office (IMS)', 'admin@ims.app')
    returning id into v_shop_id;
  end if;

  -- Super Admin role (seeded by the roles table migration).
  select id into v_role_id from public.roles where slug = 'super_admin';

  -- Create the Supabase Auth user (password handled by Auth, not public.users).
  select id into v_user_id from auth.users where email = 'admin@ims.app';

  if v_user_id is null then
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    )
    values (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'admin@ims.app',
      crypt('SuperAdmin1!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin"}',
      now(), now()
    )
    returning id into v_user_id;
  end if;

  -- Link the Auth user to the IMS profile + role.
  insert into public.users (id, shop_id, role_id, full_name)
  values (v_user_id, v_shop_id, v_role_id, 'Super Admin')
  on conflict (id) do nothing;
end $$;