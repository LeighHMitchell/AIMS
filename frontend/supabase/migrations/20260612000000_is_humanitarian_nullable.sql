-- IATI tri-state: null = not reported (distinct from false). Idempotent.
alter table public.transactions alter column is_humanitarian drop not null;
