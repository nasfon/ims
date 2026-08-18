-- TEMP DIAGNOSTIC: evaluate current_user_ctx() as a specific user by faking
-- the request.jwt.claims GUC. Used to verify RLS identity resolution for the
-- super-admin accounts. Will be dropped after diagnosis.
create or replace function public.test_ctx_as(p_sub uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_sub::text, 'role', 'authenticated')::text,
    true
  );
  select * into r from public.current_user_ctx();
  return json_build_object(
    'auth_uid', auth.uid(),
    'shop_id', r.shop_id,
    'role_id', r.role_id,
    'role_slug', r.role_slug,
    'is_super', r.is_super_admin,
    'raw_claims', current_setting('request.jwt.claims', true)
  );
end;
$$;
grant execute on function public.test_ctx_as(uuid) to service_role, authenticated;
