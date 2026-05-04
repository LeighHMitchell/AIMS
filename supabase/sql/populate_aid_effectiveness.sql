-- ============================================================================
-- populate_aid_effectiveness.sql
--
-- Populates activities.general_info -> 'aidEffectiveness' for ALL activities
-- with realistic synthetic values, overwriting any existing aidEffectiveness
-- payload. Field names and option strings match what AidEffectivenessForm.tsx
-- reads/writes, so the Activity Editor renders the data correctly and the
-- /aid-effectiveness-dashboard metrics light up.
--
-- Pre-condition: aid_effectiveness_options must contain rows for the four
-- configurable categories (includedInNationalPlan, linkedToGovFramework,
-- mutualAccountabilityFramework, capacityDevFromNationalPlan). If empty,
-- run seed-aid-effectiveness-options.sql first. If any category is empty,
-- the corresponding dropdown falls back to its negative label.
--
-- Run in Supabase SQL Editor (or psql). Single statement.
-- ============================================================================

WITH option_groups AS (
  SELECT
    category,
    jsonb_agg(jsonb_build_object('id', id, 'label', label) ORDER BY sort_order, label) AS items
  FROM aid_effectiveness_options
  WHERE is_active = true
  GROUP BY category
),
opt_arrays AS (
  SELECT
    COALESCE((SELECT items FROM option_groups WHERE category = 'includedInNationalPlan'),        '[]'::jsonb) AS plan_opts,
    COALESCE((SELECT items FROM option_groups WHERE category = 'linkedToGovFramework'),          '[]'::jsonb) AS framework_opts,
    COALESCE((SELECT items FROM option_groups WHERE category = 'mutualAccountabilityFramework'), '[]'::jsonb) AS mutual_opts,
    COALESCE((SELECT items FROM option_groups WHERE category = 'capacityDevFromNationalPlan'),   '[]'::jsonb) AS capacity_opts
)
UPDATE activities a
SET
  general_info = jsonb_set(
    COALESCE(a.general_info, '{}'::jsonb),
    '{aidEffectiveness}',
    -- jsonb_build_object is capped at 100 args (50 key/value pairs); we split
    -- the payload into two halves and concatenate them with `||`.
    jsonb_build_object(
      -- ---- Section 1: Government Ownership & Strategic Alignment (GPEDC 1) ----
      'implementingPartner',              COALESCE(a.reporting_org_id::text, ''),
      'formallyApprovedByGov',            CASE WHEN random() < 0.75 THEN 'yes' ELSE 'no' END,
      'indicatorsFromGov',                CASE WHEN random() < 0.70 THEN 'yes' ELSE 'no' END,
      'indicatorsViaGovData',             CASE WHEN random() < 0.65 THEN 'yes' ELSE 'no' END,
      'implementedByNationalInstitution', CASE WHEN random() < 0.65 THEN 'yes' ELSE 'no' END,
      'govEntityAccountable',             CASE WHEN random() < 0.75 THEN 'yes' ELSE 'no' END,
      'supportsPublicSector',             CASE WHEN random() < 0.80 THEN 'yes' ELSE 'no' END,

      'includedInNationalPlan',
        CASE WHEN plan_pick.picked IS NULL OR plan_pick.use_negative
             THEN 'Not included'
             ELSE plan_pick.picked ->> 'label' END,
      'includedInNationalPlanIds',
        CASE WHEN plan_pick.picked IS NULL OR plan_pick.use_negative
             THEN '[]'::jsonb
             ELSE jsonb_build_array(plan_pick.picked ->> 'id') END,

      'linkedToGovFramework',
        CASE WHEN framework_pick.picked IS NULL OR framework_pick.use_negative
             THEN 'Not linked'
             ELSE framework_pick.picked ->> 'label' END,
      'linkedToGovFrameworkIds',
        CASE WHEN framework_pick.picked IS NULL OR framework_pick.use_negative
             THEN '[]'::jsonb
             ELSE jsonb_build_array(framework_pick.picked ->> 'id') END,

      'capacityDevFromNationalPlan',
        CASE WHEN capacity_pick.picked IS NULL OR capacity_pick.use_negative
             THEN 'Not based on national plan'
             ELSE capacity_pick.picked ->> 'label' END,
      'capacityDevFromNationalPlanIds',
        CASE WHEN capacity_pick.picked IS NULL OR capacity_pick.use_negative
             THEN '[]'::jsonb
             ELSE jsonb_build_array(capacity_pick.picked ->> 'id') END,

      'numOutcomeIndicators', 1 + floor(random() * 12)::int,

      -- ---- Section 2: Country PFM & Procurement (GPEDC 5a) ----
      'fundsViaNationalTreasury',  CASE WHEN random() < 0.70 THEN 'yes' ELSE 'no' END,
      'govBudgetSystem',           CASE WHEN gbs.use_yes THEN 'yes' ELSE 'no' END,
      'govFinReporting',           CASE WHEN random() < 0.75 THEN 'yes' ELSE 'no' END,
      'finReportingIntegratedPFM', CASE WHEN random() < 0.65 THEN 'yes' ELSE 'no' END,
      'govAudit',                  CASE WHEN random() < 0.70 THEN 'yes' ELSE 'no' END,
      'govProcurement',            CASE WHEN random() < 0.65 THEN 'yes' ELSE 'no' END,
      'govSystemWhyNot',
        CASE WHEN gbs.use_yes THEN ''
             ELSE (ARRAY[
               'Donor regulations require parallel financial systems.',
               'Government PFM capacity not yet certified for direct use.',
               'Project structured under multilateral trust fund arrangements.',
               'Use of country systems pending fiduciary risk assessment.'
             ])[1 + floor(random() * 4)::int]
        END,

      -- ---- Section 3: Predictability & Aid Characteristics (GPEDC 5b, 6, 10) ----
      'annualBudgetShared',          CASE WHEN random() < 0.70 THEN 'yes' ELSE 'no' END,
      'forwardPlanShared',           CASE WHEN random() < 0.65 THEN 'yes' ELSE 'no' END,
      'multiYearFinancingAgreement', CASE WHEN random() < 0.60 THEN 'yes' ELSE 'no' END,
      'tiedStatus',
        (ARRAY['untied','untied','untied','untied','partially_tied','partially_tied','tied'])[1 + floor(random() * 7)::int],

      -- ---- Section 4: Transparency & Reporting (GPEDC 4) ----
      'annualFinReportsPublic',        CASE WHEN random() < 0.70 THEN 'yes' ELSE 'no' END,
      'dataUpdatedPublicly',           CASE WHEN random() < 0.65 THEN 'yes' ELSE 'no' END,
      'finalEvalPlanned',              CASE WHEN eval_p.use_yes THEN 'yes' ELSE 'no' END,
      'finalEvalDate',
        CASE
          WHEN NOT eval_p.use_yes THEN ''
          WHEN a.planned_end_date IS NOT NULL
            THEN to_char(a.planned_end_date::timestamp + INTERVAL '6 months', 'YYYY-MM-DD')
          ELSE to_char(NOW() + INTERVAL '12 months', 'YYYY-MM-DD')
        END,
      'evalReportPublic',              CASE WHEN random() < 0.60 THEN 'yes' ELSE 'no' END,
      'performanceIndicatorsReported', CASE WHEN random() < 0.70 THEN 'yes' ELSE 'no' END
    )
    ||
    jsonb_build_object(
      -- ---- Section 5: Mutual Accountability (GPEDC 7) ----
      'jointAnnualReview', CASE WHEN random() < 0.65 THEN 'yes' ELSE 'no' END,
      'mutualAccountabilityFramework',
        CASE WHEN mutual_pick.picked IS NULL OR mutual_pick.use_negative
             THEN 'Not assessed'
             ELSE mutual_pick.picked ->> 'label' END,
      'mutualAccountabilityFrameworkIds',
        CASE WHEN mutual_pick.picked IS NULL OR mutual_pick.use_negative
             THEN '[]'::jsonb
             ELSE jsonb_build_array(mutual_pick.picked ->> 'id') END,
      'correctiveActionsDocumented', CASE WHEN random() < 0.55 THEN 'yes' ELSE 'no' END,

      -- ---- Section 6: Civil Society & Private Sector (GPEDC 2 & 3) ----
      'civilSocietyConsulted',
        (ARRAY['Formal structured','Informal','Information sharing only','Not consulted'])[1 + floor(random() * 4)::int],
      'csoInvolvedInImplementation',
        (ARRAY['Lead implementer','Co-implementer','Advisory/oversight','Not involved'])[1 + floor(random() * 4)::int],
      'coreFlexibleFundingToCSO',
        (ARRAY['Core/institutional','Flexible project','Earmarked only','No funding to CSOs'])[1 + floor(random() * 4)::int],
      'publicPrivateDialogue', CASE WHEN random() < 0.60 THEN 'yes' ELSE 'no' END,
      'privateSectorEngaged',
        (ARRAY['Governance/oversight','Financial partner','Technical partner','Not engaged'])[1 + floor(random() * 4)::int],

      -- ---- Section 7: Gender Equality & Inclusion (GPEDC 8) ----
      -- Weighted to favour Significant; labels match MULTI_OPTION_FIELDS.genderObjectivesIntegrated.
      'genderObjectivesIntegrated',
        (ARRAY['Principal','Significant','Significant','Marginal','Not targeted'])[1 + floor(random() * 5)::int],
      'genderBudgetAllocation',        CASE WHEN random() < 0.55 THEN 'yes' ELSE 'no' END,
      'genderDisaggregatedIndicators', CASE WHEN random() < 0.65 THEN 'yes' ELSE 'no' END,

      -- ---- Section 8: Contacts (left empty; production data lives in junction tables) ----
      'contactName',  '',
      'contactOrg',   '',
      'contactEmail', '',
      'contactPhone', '',
      'contacts',     '[]'::jsonb,

      -- ---- Section 9: Documents (skipped - synthetic data implies no real files) ----
      'documents',             '{}'::jsonb,
      'externalDocumentLink',  '',
      'externalDocumentLinks', '[]'::jsonb,
      'uploadedDocument',      '',
      'uploadedDocumentUrl',   '',

      -- ---- Section 10: Remarks & metadata ----
      'remarks',  'Auto-populated synthetic data for dashboard demo.',
      'isDraft',  false,
      'lastSaved', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    true
  ),
  updated_at = NOW()
FROM opt_arrays oa,
LATERAL (
  SELECT
    CASE WHEN jsonb_array_length(oa.plan_opts) > 0
         THEN oa.plan_opts -> floor(random() * jsonb_array_length(oa.plan_opts))::int
         ELSE NULL END AS picked,
    random() < 0.15 AS use_negative
) plan_pick,
LATERAL (
  SELECT
    CASE WHEN jsonb_array_length(oa.framework_opts) > 0
         THEN oa.framework_opts -> floor(random() * jsonb_array_length(oa.framework_opts))::int
         ELSE NULL END AS picked,
    random() < 0.15 AS use_negative
) framework_pick,
LATERAL (
  SELECT
    CASE WHEN jsonb_array_length(oa.mutual_opts) > 0
         THEN oa.mutual_opts -> floor(random() * jsonb_array_length(oa.mutual_opts))::int
         ELSE NULL END AS picked,
    random() < 0.20 AS use_negative
) mutual_pick,
LATERAL (
  SELECT
    CASE WHEN jsonb_array_length(oa.capacity_opts) > 0
         THEN oa.capacity_opts -> floor(random() * jsonb_array_length(oa.capacity_opts))::int
         ELSE NULL END AS picked,
    random() < 0.20 AS use_negative
) capacity_pick,
LATERAL (SELECT random() < 0.70 AS use_yes) gbs,
LATERAL (SELECT random() < 0.65 AS use_yes) eval_p
;

-- ============================================================================
-- Verification (run separately after the UPDATE):
--
-- 1) Row counts:
--    SELECT COUNT(*) FILTER (WHERE general_info ? 'aidEffectiveness') AS populated,
--           COUNT(*)                                                  AS total
--    FROM activities;
--
-- 2) Spot-check a few rows:
--    SELECT id,
--           general_info -> 'aidEffectiveness' ->> 'tiedStatus'              AS tied_status,
--           general_info -> 'aidEffectiveness' ->> 'includedInNationalPlan'  AS in_plan,
--           jsonb_array_length(general_info -> 'aidEffectiveness' -> 'includedInNationalPlanIds') AS plan_ids,
--           general_info -> 'aidEffectiveness' ->> 'genderObjectivesIntegrated' AS gender
--    FROM activities
--    LIMIT 5;
--
-- 3) Open an activity in the Activity Editor -> Aid Effectiveness tab and
--    confirm the form renders all sections correctly. Then check
--    /aid-effectiveness-dashboard for non-zero metrics.
-- ============================================================================
