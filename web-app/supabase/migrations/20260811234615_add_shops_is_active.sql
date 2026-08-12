-- Add is_active to shops to support disabling shops (Super Admin).
-- See Frontend UI Specification (Shops: Status / Disable Shop) and UAT §3.2.

alter table public.shops
  add column if not exists is_active boolean not null default true;

create index if not exists shops_is_active_idx on public.shops (is_active);