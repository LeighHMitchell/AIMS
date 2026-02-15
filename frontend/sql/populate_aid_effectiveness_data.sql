-- ============================================================================
-- Populate Aid Effectiveness Data for All Activities
-- ============================================================================
-- This SQL populates the aidEffectiveness section of general_info (JSONB)
-- for all activities with varied, realistic GPEDC-aligned responses.
--
-- Activities are distributed across 10 profiles using ROW_NUMBER() % 10:
--   Buckets 0-1: High Performers (~20%) - strong across all indicators
--   Buckets 2-3: Good Alignment  (~20%) - positive with some gaps
--   Buckets 4-5: Moderate         (~20%) - mixed results
--   Bucket  6:   Budget-Focused   (~10%) - strong budget sharing, weak gov systems
--   Bucket  7:   Gov-Systems-Led  (~10%) - strong gov systems, weak predictability
--   Buckets 8-9: Low Alignment    (~20%) - mostly needs improvement
--
-- Target dashboard metrics (approximate):
--   GPEDC Compliance:    ~55-65%
--   Gov Systems Usage:   ~50-55%
--   Untied Aid:          ~50%
--   Avg Outcome Indicators: ~4
--   Budget Sharing Rate: ~60%
--   Evaluation Planning: ~50%
-- ============================================================================

-- First, let's see what we're working with
-- SELECT count(*) as total_activities,
--        count(general_info->'aidEffectiveness') as already_have_data
-- FROM activities;

-- Main update: populate all activities with varied aid effectiveness data
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at, id) as rn
  FROM activities
),
profiles AS (
  SELECT
    n.id,
    n.rn,
    n.rn % 10 as bucket,
    (n.rn / 10) % 5 as sub  -- sub-variation within each bucket
  FROM numbered n
)
UPDATE activities a
SET
  general_info = COALESCE(a.general_info, '{}'::jsonb) || jsonb_build_object(
    'aidEffectiveness',
    COALESCE(a.general_info->'aidEffectiveness', '{}'::jsonb) || jsonb_build_object(

      -- ================================================================
      -- Section 1: Results Framework Alignment (GPEDC Indicator 1)
      -- ================================================================

      'linkedToGovFramework', (p.bucket IN (0, 1, 2, 3, 4, 7)),
      -- true for 60% of activities

      'supportsPublicSector', (p.bucket IN (0, 1, 2, 4, 7)),
      -- true for 50% of activities

      'numOutcomeIndicators', CASE p.bucket
        WHEN 0 THEN 6 + (p.sub % 4)    -- 6-9
        WHEN 1 THEN 5 + (p.sub % 3)    -- 5-7
        WHEN 2 THEN 4 + (p.sub % 4)    -- 4-7
        WHEN 3 THEN 3 + (p.sub % 3)    -- 3-5
        WHEN 4 THEN 3 + (p.sub % 2)    -- 3-4
        WHEN 5 THEN 2 + (p.sub % 2)    -- 2-3
        WHEN 6 THEN 3 + (p.sub % 3)    -- 3-5
        WHEN 7 THEN 5 + (p.sub % 3)    -- 5-7
        WHEN 8 THEN 1 + (p.sub % 2)    -- 1-2
        WHEN 9 THEN 1 + (p.sub % 2)    -- 1-2
        ELSE 2
      END,
      -- average ~3.8 indicators per activity

      'indicatorsFromGov', (p.bucket IN (0, 1, 2, 3, 6, 7)),
      -- true for 60% of activities

      'indicatorsViaGovData', (p.bucket IN (0, 1, 2, 7)),
      -- true for 40% of activities

      'finalEvalPlanned', (p.bucket IN (0, 1, 2, 4, 7)),
      -- true for 50% of activities

      'finalEvalDate', CASE
        WHEN p.bucket = 0 THEN '2026-' || LPAD(((p.sub % 6) + 6)::text, 2, '0') || '-15'
        WHEN p.bucket = 1 THEN '2027-' || LPAD(((p.sub % 6) + 1)::text, 2, '0') || '-30'
        WHEN p.bucket = 2 THEN '2026-' || LPAD(((p.sub % 4) + 9)::text, 2, '0') || '-01'
        WHEN p.bucket = 4 THEN '2027-' || LPAD(((p.sub % 6) + 3)::text, 2, '0') || '-15'
        WHEN p.bucket = 7 THEN '2026-' || LPAD(((p.sub % 3) + 10)::text, 2, '0') || '-31'
        ELSE NULL
      END,
      -- Dates spread across Jun 2026 - Jun 2027 for activities with evaluations planned

      -- ================================================================
      -- Section 2: Use of Country Systems (GPEDC Indicator 5a)
      -- ================================================================

      'govBudgetSystem', (p.bucket IN (0, 1, 2, 3, 6, 7)),
      -- true for 60% - budget execution through government

      'govFinReporting', (p.bucket IN (0, 1, 2, 6, 7)),
      -- true for 50% - government financial reporting

      'govAudit', (p.bucket IN (0, 1, 7)),
      -- true for 30% - government audit (lowest uptake, realistic)

      'govProcurement', (p.bucket IN (0, 1, 7)),
      -- true for 30% - national procurement (lowest uptake, realistic)

      'govSystemWhyNot', CASE p.bucket
        WHEN 0 THEN NULL  -- all systems used
        WHEN 1 THEN NULL  -- all systems used
        WHEN 2 THEN 'Government audit and procurement systems do not yet meet the fiduciary standards required by the funding agreement. Technical assistance is being provided to strengthen these systems.'
        WHEN 3 THEN 'Financial reporting and audit functions are handled through the donor''s quality assurance framework. Government budget execution is used for disbursements. Transition plan in development.'
        WHEN 4 THEN 'Government financial management systems lack the required reporting capabilities for this project type. Capacity building support is being provided alongside project implementation.'
        WHEN 5 THEN 'Donor regulations require use of independent financial management, audit and procurement procedures for projects above the value threshold. Annual joint reviews monitor progress towards country systems.'
        WHEN 6 THEN 'Government budget and financial reporting systems are utilised. Audit and procurement handled externally due to capacity constraints in the national audit office and procurement authority.'
        WHEN 7 THEN NULL  -- all systems used
        WHEN 8 THEN 'Legal and regulatory restrictions prevent use of national systems at this stage. A phased transition plan has been agreed with government, targeting 50% country systems usage by project mid-term.'
        WHEN 9 THEN 'Project governance structure requires independent financial management and oversight mechanisms. Working with government to identify areas where national systems can be progressively adopted.'
        ELSE NULL
      END,

      -- ================================================================
      -- Section 3: Aid Predictability (GPEDC Indicators 5b, 6, 10)
      -- ================================================================

      'annualBudgetShared', (p.bucket IN (0, 1, 2, 3, 4, 6)),
      -- true for 60% - annual budget shared with government

      'forwardPlanShared', (p.bucket IN (0, 1, 2, 6)),
      -- true for 40% - 3-year forward expenditure shared

      'tiedStatus', CASE
        WHEN p.bucket IN (0, 1, 2, 6, 7) THEN 'untied'
        WHEN p.bucket IN (3, 4, 5) THEN 'partially_tied'
        WHEN p.bucket IN (8, 9) THEN 'tied'
        ELSE 'untied'
      END,
      -- untied: 50%, partially_tied: 30%, tied: 20%

      -- ================================================================
      -- Section 6: Remarks
      -- ================================================================

      'remarks', CASE p.bucket
        WHEN 0 THEN 'Strong alignment with national development priorities. All government systems are being utilised effectively. Annual joint reviews confirm positive trajectory on all GPEDC indicators.'
        WHEN 1 THEN 'Project demonstrates good use of country systems with results framework fully aligned to government sector plan. Ongoing capacity building supports sustainability beyond project completion.'
        WHEN 2 THEN 'Results framework aligned with government priorities. Budget information shared transparently. Working to transition audit and procurement to government systems as capacity develops.'
        WHEN 3 THEN 'Making steady progress on country systems usage. Budget information shared proactively with government planning unit. Addressing procurement alignment as priority for the next implementation phase.'
        WHEN 4 THEN 'Budget predictability is a strength of this project with annual and indicative forward plans shared. Working with government counterparts to improve use of national financial reporting and M&E systems.'
        WHEN 5 THEN 'Project focuses on building institutional capacity alongside service delivery. Government systems usage is limited by regulatory requirements but improving through targeted technical assistance programmes.'
        WHEN 6 THEN 'Annual and forward budget information shared transparently with government. Strong use of budget execution and financial reporting systems. Audit and procurement handled externally per funding agreement.'
        WHEN 7 THEN 'Excellent use of government systems across budget execution, financial reporting, audit and procurement. Results indicators sourced from national statistical system. Budget predictability needs strengthening.'
        WHEN 8 THEN 'Initial implementation phase with transitional management arrangements. Plan agreed with government to progressively adopt national systems. Annual budget information sharing to commence from next fiscal year.'
        WHEN 9 THEN 'Early-stage project establishing operational foundations. Independent management systems currently in use with transition plan under development. Engagement with government M&E frameworks being explored.'
        ELSE 'Aid effectiveness data collected and reported per GPEDC monitoring framework requirements.'
      END,

      -- ================================================================
      -- Metadata
      -- ================================================================

      'lastSaved', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'isDraft', false
    )
  ),
  updated_at = NOW()
FROM profiles p
WHERE a.id = p.id;


-- ============================================================================
-- Populate implementingPartner with real organization IDs
-- ============================================================================
-- Assigns each activity a real org from the organizations table,
-- cycling through available orgs so there's variety.

WITH numbered_activities AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at, id) as rn
  FROM activities
),
numbered_orgs AS (
  SELECT
    id as org_id,
    ROW_NUMBER() OVER (ORDER BY name) as org_rn
  FROM organizations
),
org_count AS (
  SELECT count(*) as total FROM organizations
),
assignments AS (
  SELECT
    na.id as activity_id,
    no2.org_id
  FROM numbered_activities na
  CROSS JOIN org_count oc
  JOIN numbered_orgs no2
    ON no2.org_rn = ((na.rn - 1) % oc.total) + 1
)
UPDATE activities a
SET
  general_info = jsonb_set(
    COALESCE(a.general_info, '{}'::jsonb),
    '{aidEffectiveness,implementingPartner}',
    to_jsonb(ass.org_id::text)
  ),
  updated_at = NOW()
FROM assignments ass
WHERE a.id = ass.activity_id;


-- ============================================================================
-- Verification Queries
-- ============================================================================

-- 1. Summary of populated data
SELECT
  count(*) as total_activities,
  count(general_info->'aidEffectiveness') as activities_with_data,

  -- Results Framework
  count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'linkedToGovFramework')::boolean = true) as linked_to_gov_framework,
  count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'supportsPublicSector')::boolean = true) as supports_public_sector,
  round(avg((general_info->'aidEffectiveness'->>'numOutcomeIndicators')::numeric), 1) as avg_outcome_indicators,
  count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'indicatorsFromGov')::boolean = true) as indicators_from_gov,
  count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'indicatorsViaGovData')::boolean = true) as indicators_via_gov_data,
  count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'finalEvalPlanned')::boolean = true) as final_eval_planned,

  -- Government Systems
  count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'govBudgetSystem')::boolean = true) as gov_budget_system,
  count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'govFinReporting')::boolean = true) as gov_fin_reporting,
  count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'govAudit')::boolean = true) as gov_audit,
  count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'govProcurement')::boolean = true) as gov_procurement,

  -- Aid Predictability
  count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'annualBudgetShared')::boolean = true) as annual_budget_shared,
  count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'forwardPlanShared')::boolean = true) as forward_plan_shared,

  -- Tied Status Distribution
  count(*) FILTER (WHERE general_info->'aidEffectiveness'->>'tiedStatus' = 'untied') as untied_count,
  count(*) FILTER (WHERE general_info->'aidEffectiveness'->>'tiedStatus' = 'partially_tied') as partially_tied_count,
  count(*) FILTER (WHERE general_info->'aidEffectiveness'->>'tiedStatus' = 'tied') as tied_count
FROM activities;

-- 2. Percentage breakdown
SELECT
  count(*) as total,
  round(100.0 * count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'linkedToGovFramework')::boolean) / count(*), 1) as pct_gov_framework,
  round(100.0 * count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'supportsPublicSector')::boolean) / count(*), 1) as pct_public_sector,
  round(100.0 * count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'finalEvalPlanned')::boolean) / count(*), 1) as pct_eval_planned,
  round(100.0 * count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'govBudgetSystem')::boolean) / count(*), 1) as pct_gov_budget,
  round(100.0 * count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'govFinReporting')::boolean) / count(*), 1) as pct_gov_fin_reporting,
  round(100.0 * count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'govAudit')::boolean) / count(*), 1) as pct_gov_audit,
  round(100.0 * count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'govProcurement')::boolean) / count(*), 1) as pct_gov_procurement,
  round(100.0 * count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'annualBudgetShared')::boolean) / count(*), 1) as pct_budget_shared,
  round(100.0 * count(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'forwardPlanShared')::boolean) / count(*), 1) as pct_forward_plan,
  round(100.0 * count(*) FILTER (WHERE general_info->'aidEffectiveness'->>'tiedStatus' = 'untied') / count(*), 1) as pct_untied,
  round(100.0 * count(*) FILTER (WHERE general_info->'aidEffectiveness'->>'tiedStatus' = 'partially_tied') / count(*), 1) as pct_partially_tied,
  round(100.0 * count(*) FILTER (WHERE general_info->'aidEffectiveness'->>'tiedStatus' = 'tied') / count(*), 1) as pct_tied
FROM activities;

-- 3. Sample of populated data (first 5 activities)
SELECT
  id,
  title_narrative,
  general_info->'aidEffectiveness'->>'linkedToGovFramework' as gov_framework,
  general_info->'aidEffectiveness'->>'numOutcomeIndicators' as indicators,
  general_info->'aidEffectiveness'->>'tiedStatus' as tied_status,
  general_info->'aidEffectiveness'->>'govBudgetSystem' as gov_budget,
  general_info->'aidEffectiveness'->>'annualBudgetShared' as budget_shared,
  LEFT(general_info->'aidEffectiveness'->>'remarks', 80) as remarks_preview
FROM activities
ORDER BY created_at
LIMIT 5;
