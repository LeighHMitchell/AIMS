-- Program Logic (Results Framework / Theory of Change) — design-level change model.
--
-- This is a SEPARATE object type from IATI results. IATI results
-- (activity_results / result_indicators) are the machine-readable reporting layer
-- and live on activities. A program logic is the design-level change model that
-- sits ABOVE them. A logic node may optionally LINK to existing result_indicators
-- as measurement evidence, but never creates or owns an indicator. The graph itself
-- is internal to Aether and is never exported to IATI; only the linked indicators
-- export, through the existing result/indicator structure.
--
-- Mapping to real Aether entities (the build prompt's names are indicative):
--   investment  -> a top-level `activities` row (the umbrella). program_logics has
--                  one row per umbrella activity.
--   activity    -> a child `activities` row (an activity sub-logic). logic_nodes
--                  with scope='activity' point at one via activity_id.
--   indicator   -> `result_indicators` (the IATI indicator table).
--   user        -> auth.users / public.users.
--
-- Access model mirrors the rest of the app: activities themselves rely on
-- route-level auth (src/lib/activity-permissions-server.ts canEditActivity) as the
-- primary gate. RLS here is a defense-in-depth backstop that scopes a program logic
-- to the umbrella activity's existing read/edit access. SECURITY DEFINER helper
-- functions resolve that access (see pl_user_can_* below).
--
-- Idempotent: safe to re-run (enums guarded, tables IF NOT EXISTS, policies dropped
-- then recreated, functions CREATE OR REPLACE).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type program_logic_status as enum ('draft','baselined','active','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type framework_preset as enum ('dfat','usaid','world_bank','eu','dac_default','gac','custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type iati_result_type as enum ('output','outcome','impact','none');
exception when duplicate_object then null; end $$;

do $$ begin
  create type node_scope as enum ('investment','activity');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edge_link_type as enum ('attribution','contribution');
exception when duplicate_object then null; end $$;

do $$ begin
  create type snapshot_type as enum ('baseline','revision');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One umbrella logic per investment (= per top-level activity).
create table if not exists program_logics (
  id               uuid primary key default gen_random_uuid(),
  investment_id    uuid not null references activities(id) on delete cascade,
  framework_preset framework_preset not null default 'dac_default',
  title            text not null,
  description      text,
  status           program_logic_status not null default 'draft',
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (investment_id)
);

-- The ordered tier vocabulary for one logic (seeded from a preset, then editable).
create table if not exists logic_tiers (
  id                   uuid primary key default gen_random_uuid(),
  program_logic_id     uuid not null references program_logics(id) on delete cascade,
  name                 text not null,             -- e.g. "End-of-Program Outcome"
  short_code           text not null,             -- e.g. "EOPO"
  level_order          int  not null,             -- 0 = most immediate (inputs/activities); ascending toward impact/goal
  iati_result_type     iati_result_type not null default 'none', -- mapping used only for export of linked indicators
  attribution_boundary boolean not null default false,          -- the accountability ceiling tier
  created_at           timestamptz not null default now(),
  unique (program_logic_id, level_order),
  unique (program_logic_id, short_code)
);

-- Design-level statements; never an IATI activity record.
create table if not exists logic_nodes (
  id               uuid primary key default gen_random_uuid(),
  program_logic_id uuid not null references program_logics(id) on delete cascade,
  tier_id          uuid not null references logic_tiers(id),
  scope            node_scope not null default 'investment',
  activity_id      uuid references activities(id),  -- required when scope = 'activity'
  statement        text not null,
  description      text,
  sort_order       int  not null default 0,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (scope = 'investment' or activity_id is not null)
);

-- The DAG. Direction: from = contributing/lower node, to = receiving/higher node.
create table if not exists logic_edges (
  id               uuid primary key default gen_random_uuid(),
  program_logic_id uuid not null references program_logics(id) on delete cascade,
  from_node_id     uuid not null references logic_nodes(id) on delete cascade,
  to_node_id       uuid not null references logic_nodes(id) on delete cascade,
  link_type        edge_link_type not null default 'contribution',
  rationale        text,            -- optional if-then / assumption note
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  check (from_node_id <> to_node_id),
  unique (from_node_id, to_node_id)
);

-- Optional measurement evidence: node -> existing IATI result indicator.
-- Deleting the indicator cascades only this link row, never the node.
create table if not exists logic_indicator_links (
  id           uuid primary key default gen_random_uuid(),
  node_id      uuid not null references logic_nodes(id) on delete cascade,
  indicator_id uuid not null references result_indicators(id) on delete cascade,
  note         text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  unique (node_id, indicator_id)
);

-- Full-graph snapshots for versioning.
create table if not exists logic_snapshots (
  id               uuid primary key default gen_random_uuid(),
  program_logic_id uuid not null references program_logics(id) on delete cascade,
  version_label    text not null,                 -- e.g. "Baseline", "Rev 1 - MTR 2026"
  snapshot_type    snapshot_type not null,
  reason           text,                          -- required for revisions (enforced in API)
  payload          jsonb not null,                -- serialized tiers + nodes + edges + indicator links at snapshot time
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);

create index if not exists logic_tiers_program_logic_id_idx           on logic_tiers          (program_logic_id);
create index if not exists logic_nodes_program_logic_id_idx           on logic_nodes          (program_logic_id);
create index if not exists logic_nodes_tier_id_idx                    on logic_nodes          (tier_id);
create index if not exists logic_nodes_activity_id_idx                on logic_nodes          (activity_id);
create index if not exists logic_edges_program_logic_id_idx           on logic_edges          (program_logic_id);
create index if not exists logic_edges_from_node_id_idx               on logic_edges          (from_node_id);
create index if not exists logic_edges_to_node_id_idx                 on logic_edges          (to_node_id);
create index if not exists logic_indicator_links_node_id_idx          on logic_indicator_links(node_id);
create index if not exists logic_snapshots_program_logic_id_idx       on logic_snapshots      (program_logic_id);

-- ---------------------------------------------------------------------------
-- Graph functions: cycle prevention + roll-up
-- ---------------------------------------------------------------------------

-- Would adding edge p_from -> p_to close a loop? True if p_from is already an
-- ancestor of p_to (i.e. p_to can already reach p_from going "up" the graph).
create or replace function public.would_create_cycle(p_from uuid, p_to uuid)
returns boolean language sql stable as $$
  with recursive reach as (
    select to_node_id as n from logic_edges where from_node_id = p_to
    union
    select e.to_node_id from logic_edges e join reach r on e.from_node_id = r.n
  )
  select exists (select 1 from reach where n = p_from);
$$;

-- Every node that contributes, directly or transitively, to p_target_node_id.
create or replace function public.program_logic_rollup(p_target_node_id uuid)
returns setof logic_nodes language sql stable as $$
  with recursive contributors as (
    select from_node_id as n from logic_edges where to_node_id = p_target_node_id
    union
    select e.from_node_id from logic_edges e join contributors c on e.to_node_id = c.n
  )
  select n.* from contributors c join logic_nodes n on n.id = c.n;
$$;

-- ---------------------------------------------------------------------------
-- RLS helper functions (SECURITY DEFINER so they see all rows regardless of RLS;
-- mirror src/lib/activity-permissions-server.ts canEditActivity rule)
-- ---------------------------------------------------------------------------

-- May the current user EDIT this activity?
--   super_user OR owning org (activities.reporting_org_id = user's org)
--   OR creator (activities.created_by = uid) OR accepted contributor org.
create or replace function public.pl_user_can_edit_activity(p_activity_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'super_user')
    or exists (
      select 1 from activities a join users u on u.id = auth.uid()
      where a.id = p_activity_id and u.organization_id is not null
        and a.reporting_org_id = u.organization_id
    )
    or exists (
      -- created_by may be uuid or varchar across environments; compare as text
      select 1 from activities a
      where a.id = p_activity_id and a.created_by::text = auth.uid()::text
    )
    or exists (
      select 1 from activity_contributors ac join users u on u.id = auth.uid()
      where ac.activity_id = p_activity_id and u.organization_id is not null
        and ac.organization_id = u.organization_id and ac.status = 'accepted'
    );
$$;

-- May the current user READ this activity? published OR can edit.
create or replace function public.pl_user_can_access_activity(p_activity_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    exists (
      select 1 from activities a
      where a.id = p_activity_id and a.publication_status = 'published'
    )
    or public.pl_user_can_edit_activity(p_activity_id);
$$;

create or replace function public.pl_user_can_edit_logic(p_logic_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.pl_user_can_edit_activity(
    (select investment_id from program_logics where id = p_logic_id)
  );
$$;

create or replace function public.pl_user_can_access_logic(p_logic_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.pl_user_can_access_activity(
    (select investment_id from program_logics where id = p_logic_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS policies (idempotent: enable + drop all + recreate)
-- ---------------------------------------------------------------------------
do $$
declare
  pol RECORD;
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'program_logics','logic_tiers','logic_nodes','logic_edges',
    'logic_indicator_links','logic_snapshots'
  ];
begin
  foreach tbl in array tables loop
    execute format('alter table public.%I enable row level security', tbl);
    for pol in
      select policyname from pg_policies where schemaname = 'public' and tablename = tbl
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
    end loop;
  end loop;
end $$;

-- program_logics: scoped directly by investment activity
create policy "pl read"   on public.program_logics for select to authenticated
  using (public.pl_user_can_access_activity(investment_id));
create policy "pl insert" on public.program_logics for insert to authenticated
  with check (public.pl_user_can_edit_activity(investment_id));
create policy "pl update" on public.program_logics for update to authenticated
  using (public.pl_user_can_edit_activity(investment_id))
  with check (public.pl_user_can_edit_activity(investment_id));
create policy "pl delete" on public.program_logics for delete to authenticated
  using (public.pl_user_can_edit_activity(investment_id));

-- logic_tiers / logic_nodes / logic_edges / logic_snapshots: scoped via program_logic_id
do $$
declare tbl TEXT;
begin
  foreach tbl in array ARRAY['logic_tiers','logic_nodes','logic_edges','logic_snapshots'] loop
    execute format(
      'create policy "pl child read" on public.%I for select to authenticated using (public.pl_user_can_access_logic(program_logic_id))', tbl);
    execute format(
      'create policy "pl child insert" on public.%I for insert to authenticated with check (public.pl_user_can_edit_logic(program_logic_id))', tbl);
    execute format(
      'create policy "pl child update" on public.%I for update to authenticated using (public.pl_user_can_edit_logic(program_logic_id)) with check (public.pl_user_can_edit_logic(program_logic_id))', tbl);
    execute format(
      'create policy "pl child delete" on public.%I for delete to authenticated using (public.pl_user_can_edit_logic(program_logic_id))', tbl);
  end loop;
end $$;

-- logic_indicator_links: scoped via node -> program_logic_id
create policy "pl link read" on public.logic_indicator_links for select to authenticated
  using (public.pl_user_can_access_logic((select n.program_logic_id from logic_nodes n where n.id = node_id)));
create policy "pl link insert" on public.logic_indicator_links for insert to authenticated
  with check (public.pl_user_can_edit_logic((select n.program_logic_id from logic_nodes n where n.id = node_id)));
create policy "pl link update" on public.logic_indicator_links for update to authenticated
  using (public.pl_user_can_edit_logic((select n.program_logic_id from logic_nodes n where n.id = node_id)))
  with check (public.pl_user_can_edit_logic((select n.program_logic_id from logic_nodes n where n.id = node_id)));
create policy "pl link delete" on public.logic_indicator_links for delete to authenticated
  using (public.pl_user_can_edit_logic((select n.program_logic_id from logic_nodes n where n.id = node_id)));
