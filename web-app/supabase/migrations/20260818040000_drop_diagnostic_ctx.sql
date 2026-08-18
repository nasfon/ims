-- Remove the temporary diagnostic helper used to verify RLS identity
-- resolution. No longer needed.
drop function if exists public.test_ctx_as(uuid);
