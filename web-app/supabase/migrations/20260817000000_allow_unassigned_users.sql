-- Allow users to exist without a shop (deassigned staff).
-- Super Admin can assign/deassign users to/from shops; unassigned users
-- keep their auth account but belong to no shop until reassigned.

alter table public.users
  alter column shop_id drop not null;
