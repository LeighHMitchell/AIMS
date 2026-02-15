-- =============================================================================
-- Populate Aid Effectiveness v2 data for all activities
-- Run this in Supabase SQL Editor
-- Uses 10 profiles distributed via ROW_NUMBER() % 10 for variety
-- =============================================================================

WITH numbered_activities AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM activities
),
profiles AS (
  SELECT
    na.id,
    na.rn % 10 AS profile,
    -- Pick implementing partner from existing orgs
    (SELECT org_id FROM (
      SELECT id AS org_id, ROW_NUMBER() OVER (ORDER BY id) AS org_rn
      FROM organizations
    ) orgs WHERE orgs.org_rn = (na.rn % (SELECT GREATEST(COUNT(*), 1) FROM organizations)) + 1
    LIMIT 1) AS impl_partner
  FROM numbered_activities na
)
UPDATE activities a
SET general_info = COALESCE(general_info, '{}'::jsonb) || jsonb_build_object(
  'aidEffectiveness', jsonb_build_object(
    -- Section 1: Government Ownership & Strategic Alignment
    'implementingPartner', p.impl_partner,
    'formallyApprovedByGov',          CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN true WHEN 3 THEN false WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN true WHEN 8 THEN false WHEN 9 THEN true END,
    'includedInNationalPlan',         CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN false WHEN 3 THEN true WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN true END,
    'linkedToGovFramework',           CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN true WHEN 3 THEN false WHEN 4 THEN true WHEN 5 THEN true WHEN 6 THEN false WHEN 7 THEN true WHEN 8 THEN false WHEN 9 THEN true END,
    'indicatorsFromGov',              CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN true WHEN 4 THEN false WHEN 5 THEN true WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN false END,
    'indicatorsViaGovData',           CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN false WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN true WHEN 8 THEN false WHEN 9 THEN true END,
    'implementedByNationalInstitution', CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN true WHEN 4 THEN false WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN true WHEN 8 THEN false WHEN 9 THEN true END,
    'govEntityAccountable',           CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN false WHEN 3 THEN true WHEN 4 THEN false WHEN 5 THEN true WHEN 6 THEN false WHEN 7 THEN true WHEN 8 THEN true WHEN 9 THEN false END,
    'supportsPublicSector',           CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN true WHEN 3 THEN false WHEN 4 THEN true WHEN 5 THEN true WHEN 6 THEN false WHEN 7 THEN true WHEN 8 THEN true WHEN 9 THEN false END,
    'capacityDevFromNationalPlan',    CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN false WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN false END,
    'numOutcomeIndicators',           CASE p.profile WHEN 0 THEN 8 WHEN 1 THEN 3 WHEN 2 THEN 5 WHEN 3 THEN 2 WHEN 4 THEN 7 WHEN 5 THEN 1 WHEN 6 THEN 6 WHEN 7 THEN 4 WHEN 8 THEN 10 WHEN 9 THEN 3 END,

    -- Section 2: Use of Country PFM & Procurement Systems
    'fundsViaNationalTreasury',       CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN false WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN false END,
    'govBudgetSystem',                CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN false WHEN 3 THEN true WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN true END,
    'govFinReporting',                CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN true WHEN 4 THEN false WHEN 5 THEN true WHEN 6 THEN false WHEN 7 THEN true WHEN 8 THEN true WHEN 9 THEN false END,
    'finReportingIntegratedPFM',      CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN false WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN false WHEN 9 THEN true END,
    'govAudit',                       CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN true WHEN 3 THEN false WHEN 4 THEN true WHEN 5 THEN true WHEN 6 THEN false WHEN 7 THEN true WHEN 8 THEN false WHEN 9 THEN true END,
    'govProcurement',                 CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN true WHEN 4 THEN false WHEN 5 THEN true WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN false END,
    'govSystemWhyNot',                CASE p.profile WHEN 0 THEN NULL WHEN 1 THEN 'Donor policy requires parallel systems' WHEN 2 THEN NULL WHEN 3 THEN 'Limited government PFM capacity in target region' WHEN 4 THEN 'Government procurement thresholds too low for project scale' WHEN 5 THEN 'Political instability affecting government institutions' WHEN 6 THEN NULL WHEN 7 THEN 'Fiduciary risk assessment recommended separate systems' WHEN 8 THEN 'Transitional arrangement pending capacity building' WHEN 9 THEN 'Legal framework incompatible with project requirements' END,

    -- Section 3: Predictability & Aid Characteristics
    'annualBudgetShared',             CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN true WHEN 3 THEN false WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN true WHEN 8 THEN false WHEN 9 THEN true END,
    'forwardPlanShared',              CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN true WHEN 4 THEN false WHEN 5 THEN true WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN false END,
    'multiYearFinancingAgreement',    CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN false WHEN 3 THEN true WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN true END,
    'tiedStatus',                     CASE p.profile WHEN 0 THEN 'untied' WHEN 1 THEN 'untied' WHEN 2 THEN 'partially_tied' WHEN 3 THEN 'untied' WHEN 4 THEN 'tied' WHEN 5 THEN 'untied' WHEN 6 THEN 'partially_tied' WHEN 7 THEN 'untied' WHEN 8 THEN 'tied' WHEN 9 THEN 'untied' END,

    -- Section 4: Transparency & Timely Reporting
    'annualFinReportsPublic',         CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN false WHEN 3 THEN true WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN true END,
    'dataUpdatedPublicly',            CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN true WHEN 4 THEN false WHEN 5 THEN true WHEN 6 THEN true WHEN 7 THEN true WHEN 8 THEN false WHEN 9 THEN true END,
    'finalEvalPlanned',               CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN false WHEN 3 THEN true WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN true END,
    'finalEvalDate',                  CASE p.profile WHEN 0 THEN '2026-06-15' WHEN 1 THEN '2026-12-31' WHEN 2 THEN NULL WHEN 3 THEN '2027-03-30' WHEN 4 THEN '2025-09-15' WHEN 5 THEN NULL WHEN 6 THEN '2026-08-20' WHEN 7 THEN NULL WHEN 8 THEN '2027-01-15' WHEN 9 THEN '2026-11-30' END,
    'evalReportPublic',               CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN false WHEN 3 THEN true WHEN 4 THEN false WHEN 5 THEN true WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN true END,
    'performanceIndicatorsReported',  CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN true WHEN 3 THEN false WHEN 4 THEN true WHEN 5 THEN true WHEN 6 THEN false WHEN 7 THEN true WHEN 8 THEN true WHEN 9 THEN false END,

    -- Section 5: Mutual Accountability
    'jointAnnualReview',              CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN true WHEN 4 THEN false WHEN 5 THEN true WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN false END,
    'mutualAccountabilityFramework',  CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN false WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN true WHEN 8 THEN false WHEN 9 THEN true END,
    'correctiveActionsDocumented',    CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN false WHEN 3 THEN true WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN false END,

    -- Section 6: Civil Society & Private Sector Engagement
    'civilSocietyConsulted',          CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN false WHEN 3 THEN true WHEN 4 THEN false WHEN 5 THEN true WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN true END,
    'csoInvolvedInImplementation',    CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN false WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN true WHEN 8 THEN false WHEN 9 THEN true END,
    'coreFlexibleFundingToCSO',       CASE p.profile WHEN 0 THEN false WHEN 1 THEN true WHEN 2 THEN false WHEN 3 THEN true WHEN 4 THEN false WHEN 5 THEN true WHEN 6 THEN false WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN false END,
    'publicPrivateDialogue',          CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN false WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN false WHEN 7 THEN true WHEN 8 THEN false WHEN 9 THEN true END,
    'privateSectorEngaged',           CASE p.profile WHEN 0 THEN false WHEN 1 THEN true WHEN 2 THEN false WHEN 3 THEN true WHEN 4 THEN false WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN false END,

    -- Section 7: Gender Equality & Inclusion
    'genderObjectivesIntegrated',     CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN false WHEN 3 THEN true WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN true WHEN 7 THEN true WHEN 8 THEN false WHEN 9 THEN true END,
    'genderBudgetAllocation',         CASE p.profile WHEN 0 THEN true WHEN 1 THEN false WHEN 2 THEN true WHEN 3 THEN false WHEN 4 THEN true WHEN 5 THEN false WHEN 6 THEN false WHEN 7 THEN true WHEN 8 THEN true WHEN 9 THEN false END,
    'genderDisaggregatedIndicators',  CASE p.profile WHEN 0 THEN true WHEN 1 THEN true WHEN 2 THEN false WHEN 3 THEN true WHEN 4 THEN false WHEN 5 THEN true WHEN 6 THEN true WHEN 7 THEN false WHEN 8 THEN true WHEN 9 THEN true END,

    -- Section 10: Remarks
    'remarks', CASE p.profile
      WHEN 0 THEN 'Strong government ownership with full use of country systems. Model project for GPEDC compliance.'
      WHEN 1 THEN 'Partial use of government systems due to donor policy constraints. Working toward full alignment.'
      WHEN 2 THEN 'Good use of country PFM but limited forward planning. CSO engagement ongoing.'
      WHEN 3 THEN 'Government entity leads implementation. Some procurement challenges noted.'
      WHEN 4 THEN 'Tied aid with limited transparency. Improvement plan in place for next phase.'
      WHEN 5 THEN 'Capacity building focus with progressive use of government systems planned.'
      WHEN 6 THEN 'Strong mutual accountability framework. Gender mainstreaming well integrated.'
      WHEN 7 THEN 'National institution implementing with government audit. Forward expenditure plans pending.'
      WHEN 8 THEN 'Transitional phase - moving from parallel to country systems. Strong CSO engagement.'
      WHEN 9 THEN 'Good compliance overall. Private sector engagement mechanisms being strengthened.'
    END,

    -- Metadata
    'lastSaved', NOW()::text,
    'isDraft', false
  )
)
FROM profiles p
WHERE a.id = p.id;

-- =============================================================================
-- Verification query
-- =============================================================================
SELECT
  COUNT(*) AS total_activities,
  COUNT(*) FILTER (WHERE general_info->'aidEffectiveness' IS NOT NULL) AS with_ae_data,
  COUNT(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'formallyApprovedByGov')::boolean = true) AS formally_approved,
  COUNT(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'linkedToGovFramework')::boolean = true) AS linked_gov_framework,
  COUNT(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'govBudgetSystem')::boolean = true) AS gov_budget,
  COUNT(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'fundsViaNationalTreasury')::boolean = true) AS funds_treasury,
  COUNT(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'jointAnnualReview')::boolean = true) AS joint_review,
  COUNT(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'civilSocietyConsulted')::boolean = true) AS cso_consulted,
  COUNT(*) FILTER (WHERE (general_info->'aidEffectiveness'->>'genderObjectivesIntegrated')::boolean = true) AS gender_integrated,
  COUNT(*) FILTER (WHERE general_info->'aidEffectiveness'->>'tiedStatus' = 'untied') AS untied,
  COUNT(*) FILTER (WHERE general_info->'aidEffectiveness'->>'tiedStatus' = 'partially_tied') AS partially_tied,
  COUNT(*) FILTER (WHERE general_info->'aidEffectiveness'->>'tiedStatus' = 'tied') AS tied
FROM activities;
