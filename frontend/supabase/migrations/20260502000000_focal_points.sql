-- Focal Points: first-class entity for the unified profile redesign.
--
-- The unified profile template (Activity, Organisation, SDG, Sector, Location, Policy Marker,
-- Working Group) needs a consistent "Focal Points" rail block. Today, focal-point identity is
-- inferred from a boolean flag on contacts (`activity_contacts.is_focal_point`) and from a
-- separate `government_focal_points` join table. This migration introduces a single
-- entity_type / entity_id / person_id tuple that covers all profile types uniformly.
--
-- This migration:
--   1. Creates the focal_points table.
--   2. Backfills from existing data sources (activity contacts marked as focal, government
--      focal-point joins where they exist).
--   3. Creates indexes for the rail-block read pattern.
--
-- Rollback: see the inverse statements at the bottom (commented out for safety).

begin;

-- 1. Create the table.
create type focal_point_entity_type as enum (
  'activity',
  'organisation',
  'sdg',
  'sector',
  'location',
  'policy_marker',
  'working_group'
);

create type focal_point_role as enum (
  'government_fp',
  'dp_fp',
  'technical_lead',
  'coordinator',
  'chair',
  'co_chair',
  'secretariat',
  'other'
);

create table if not exists focal_points (
  id              uuid primary key default gen_random_uuid(),
  -- person_id may reference contacts(id) in some deployments where contacts are de-duplicated
  -- to a unique-people table; in others it stays nullable for free-text seeded entries.
  person_id       uuid null,
  entity_type     focal_point_entity_type not null,
  entity_id       uuid not null,
  role            focal_point_role not null default 'other',
  role_label      text,                    -- free-text override when role = 'other'
  is_primary      boolean not null default false,
  contact_email   text,
  contact_channel text,                    -- e.g. Slack handle, MS Teams, etc.
  start_date      date,
  end_date        date,                    -- null = currently active
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table focal_points is
  'Unified focal-point assignments across all profile types. Each row is a person serving as a focal point on a specific entity for a specific role. End-dated rows are historical assignments shown in the History tab; null end_date = active assignment shown in the rail.';

comment on column focal_points.person_id is
  'Optional FK to contacts(id) when the contact has been de-duplicated to a unique-people table. Free-text seeded entries leave this null and rely on contact_email + contact_channel for identity.';

comment on column focal_points.role_label is
  'Free-text override displayed in the UI when role = "other". For typed roles the rail uses the canonical label.';

-- 2. Indexes for the rail-block read pattern (entity-scoped, then role-ordered).
create index focal_points_entity_idx on focal_points (entity_type, entity_id);
create index focal_points_person_idx on focal_points (person_id) where person_id is not null;
create index focal_points_active_idx on focal_points (entity_type, entity_id) where end_date is null;

-- 3. Backfill from existing sources.
--    Each backfill block is wrapped in `do $$ ... $$` so it skips silently if the source table
--    does not exist in this deployment (different deployments have different historical tables).

-- 3a. activity_contacts.is_focal_point -> focal_points (entity_type='activity', role='other')
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'activity_contacts'
      and column_name = 'is_focal_point'
  ) then
    insert into focal_points (entity_type, entity_id, role, role_label, person_id, contact_email, is_primary)
    select
      'activity'::focal_point_entity_type,
      ac.activity_id,
      'other'::focal_point_role,
      'Activity focal point',
      ac.contact_id,
      c.email,
      false
    from activity_contacts ac
    left join contacts c on c.id = ac.contact_id
    where ac.is_focal_point = true
      and ac.activity_id is not null;
  end if;
end $$;

-- 3b. government_focal_points -> focal_points (entity_type='activity', role='government_fp')
do $$
begin
  if to_regclass('public.government_focal_points') is not null then
    insert into focal_points (entity_type, entity_id, role, person_id, contact_email, is_primary)
    select
      'activity'::focal_point_entity_type,
      gfp.activity_id,
      'government_fp'::focal_point_role,
      gfp.person_id,
      gfp.email,
      coalesce(gfp.is_primary, true)
    from government_focal_points gfp
    where gfp.activity_id is not null;
  end if;
end $$;

-- 3c. development_partner_focal_points -> focal_points (entity_type='activity', role='dp_fp')
do $$
begin
  if to_regclass('public.development_partner_focal_points') is not null then
    insert into focal_points (entity_type, entity_id, role, person_id, contact_email, is_primary)
    select
      'activity'::focal_point_entity_type,
      dpfp.activity_id,
      'dp_fp'::focal_point_role,
      dpfp.person_id,
      dpfp.email,
      coalesce(dpfp.is_primary, false)
    from development_partner_focal_points dpfp
    where dpfp.activity_id is not null;
  end if;
end $$;

-- 4. updated_at trigger.
create or replace function focal_points_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger focal_points_updated_at
  before update on focal_points
  for each row execute function focal_points_set_updated_at();

commit;

-- ----------------------------------------------------------------------------
-- ROLLBACK (run manually if needed):
--
-- begin;
--   drop trigger if exists focal_points_updated_at on focal_points;
--   drop function if exists focal_points_set_updated_at();
--   drop index if exists focal_points_active_idx;
--   drop index if exists focal_points_person_idx;
--   drop index if exists focal_points_entity_idx;
--   drop table if exists focal_points;
--   drop type if exists focal_point_role;
--   drop type if exists focal_point_entity_type;
-- commit;
