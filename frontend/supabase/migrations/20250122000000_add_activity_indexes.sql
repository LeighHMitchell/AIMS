-- Activity table performance indexes
create index if not exists idx_activities_updated_at on activities (updated_at desc);
create index if not exists idx_activities_created_at on activities (created_at desc);
create index if not exists idx_activities_activity_status on activities (activity_status);
create index if not exists idx_activities_publication_status on activities (publication_status);
create index if not exists idx_activities_submission_status on activities (submission_status);
create index if not exists idx_activities_reporting_org_id on activities (reporting_org_id);

-- Search helpers (requires pg_trgm extension). Enable if available.
-- create extension if not exists pg_trgm;
-- create index if not exists idx_activities_title_trgm on activities using gin (title_narrative gin_trgm_ops);
-- create index if not exists idx_activities_iati_trgm on activities using gin (iati_identifier gin_trgm_ops);

-- Foreign table aggregations
create index if not exists idx_activity_budgets_activity_id on activity_budgets (activity_id);
create index if not exists idx_transactions_activity_id on transactions (activity_id);


