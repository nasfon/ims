-- Add customers / credit_payments indexes.
-- See Database Design Document §5 (Indexes): shop_id, phone, customer_id.
--
-- Idempotent: names match the indexes already created in the table migrations,
-- so this re-declares the coverage for the Phase 3 checklist item.

create index if not exists customers_shop_id_idx on public.customers (shop_id);
create index if not exists customers_phone_idx on public.customers (phone);
create index if not exists credit_payments_customer_id_created_at_idx
  on public.credit_payments (customer_id, created_at desc);