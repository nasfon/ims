-- Allow credit payments without a sale.
--
-- The credit book must support settling a customer's outstanding balance even
-- when no specific sale is identified (marking fully paid / paying down old
-- debt). Until the Phase 4 sales table exists there are no sales to reference,
-- so sale_id cannot be required. Once sales land, sale_id may be supplied and
-- validated against the sale's remaining credit.

alter table public.credit_payments
  alter column sale_id drop not null;