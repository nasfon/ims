-- Performance: add trigram search indexes and fix soft-delete partial indexes.
-- See diagnosis: product/customer search did full table scans (no ilike index),
-- and soft-delete partial indexes keyed on deleted_at (always NULL in the
-- partial set) could not narrow "active rows in my shop" scans.

-- 1. Trigram extension for case-insensitive substring search (ilike/like).
create extension if not exists pg_trgm;

-- 2. Search indexes for the most common UI actions (product/customer search).
create index if not exists products_name_trgm_idx
  on public.products using gin (name gin_trgm_ops);
create index if not exists customers_full_name_trgm_idx
  on public.customers using gin (full_name gin_trgm_ops);
create index if not exists customers_phone_trgm_idx
  on public.customers using gin (phone gin_trgm_ops);

-- 3. Correct the soft-delete partial indexes to key on shop_id so that
--    "active rows in my shop" queries skip deleted rows via an index scan
--    instead of scanning all rows and filtering deleted_at = NULL.
--    Drop the previously useless indexes that keyed on deleted_at/is_active.
drop index if exists public.products_soft_delete_idx;
drop index if exists public.customers_soft_delete_idx;
drop index if exists public.users_active_idx;

create index if not exists products_shop_id_active_idx
  on public.products (shop_id) where deleted_at is null;
create index if not exists customers_shop_id_active_idx
  on public.customers (shop_id) where deleted_at is null;
create index if not exists users_shop_id_active_idx
  on public.users (shop_id) where deleted_at is null;
