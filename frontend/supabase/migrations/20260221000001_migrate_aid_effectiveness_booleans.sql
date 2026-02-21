-- Migrate Aid Effectiveness boolean values to string values
-- Migration: 20260221000001_migrate_aid_effectiveness_booleans.sql
--
-- Converts existing true/false booleans stored in the JSONB aidEffectiveness
-- object to 'yes'/'no' strings (or appropriate dropdown values for multi-option fields).
-- This fixes the dashboard APIs which already compare against === 'yes'.

-- Helper function to migrate a single boolean field to 'yes'/'no'
CREATE OR REPLACE FUNCTION migrate_ae_boolean_field(
  activity_row activities,
  field_name text,
  true_value text DEFAULT 'yes',
  false_value text DEFAULT 'no'
) RETURNS jsonb AS $$
DECLARE
  ae jsonb;
  field_val jsonb;
BEGIN
  ae := activity_row.general_info->'aidEffectiveness';
  IF ae IS NULL THEN
    RETURN activity_row.general_info;
  END IF;

  field_val := ae->field_name;

  -- Only convert if the value is a JSON boolean (not already a string)
  IF field_val = 'true'::jsonb THEN
    ae := jsonb_set(ae, ARRAY[field_name], to_jsonb(true_value));
  ELSIF field_val = 'false'::jsonb THEN
    ae := jsonb_set(ae, ARRAY[field_name], to_jsonb(false_value));
  END IF;

  RETURN jsonb_set(activity_row.general_info, ARRAY['aidEffectiveness'], ae);
END;
$$ LANGUAGE plpgsql;

-- Perform the migration
DO $$
DECLARE
  r RECORD;
  updated_general_info jsonb;
  ae jsonb;
BEGIN
  FOR r IN
    SELECT id, general_info
    FROM activities
    WHERE general_info->'aidEffectiveness' IS NOT NULL
  LOOP
    updated_general_info := r.general_info;
    ae := updated_general_info->'aidEffectiveness';

    -- ===== 26 Yes/No fields (boolean → 'yes'/'no') =====

    -- Section 1: Government Ownership
    IF ae->'formallyApprovedByGov' = 'true'::jsonb THEN ae := jsonb_set(ae, '{formallyApprovedByGov}', '"yes"'); END IF;
    IF ae->'formallyApprovedByGov' = 'false'::jsonb THEN ae := jsonb_set(ae, '{formallyApprovedByGov}', '"no"'); END IF;

    IF ae->'indicatorsFromGov' = 'true'::jsonb THEN ae := jsonb_set(ae, '{indicatorsFromGov}', '"yes"'); END IF;
    IF ae->'indicatorsFromGov' = 'false'::jsonb THEN ae := jsonb_set(ae, '{indicatorsFromGov}', '"no"'); END IF;

    IF ae->'indicatorsViaGovData' = 'true'::jsonb THEN ae := jsonb_set(ae, '{indicatorsViaGovData}', '"yes"'); END IF;
    IF ae->'indicatorsViaGovData' = 'false'::jsonb THEN ae := jsonb_set(ae, '{indicatorsViaGovData}', '"no"'); END IF;

    IF ae->'implementedByNationalInstitution' = 'true'::jsonb THEN ae := jsonb_set(ae, '{implementedByNationalInstitution}', '"yes"'); END IF;
    IF ae->'implementedByNationalInstitution' = 'false'::jsonb THEN ae := jsonb_set(ae, '{implementedByNationalInstitution}', '"no"'); END IF;

    IF ae->'govEntityAccountable' = 'true'::jsonb THEN ae := jsonb_set(ae, '{govEntityAccountable}', '"yes"'); END IF;
    IF ae->'govEntityAccountable' = 'false'::jsonb THEN ae := jsonb_set(ae, '{govEntityAccountable}', '"no"'); END IF;

    IF ae->'supportsPublicSector' = 'true'::jsonb THEN ae := jsonb_set(ae, '{supportsPublicSector}', '"yes"'); END IF;
    IF ae->'supportsPublicSector' = 'false'::jsonb THEN ae := jsonb_set(ae, '{supportsPublicSector}', '"no"'); END IF;

    -- Section 2: Country Systems
    IF ae->'fundsViaNationalTreasury' = 'true'::jsonb THEN ae := jsonb_set(ae, '{fundsViaNationalTreasury}', '"yes"'); END IF;
    IF ae->'fundsViaNationalTreasury' = 'false'::jsonb THEN ae := jsonb_set(ae, '{fundsViaNationalTreasury}', '"no"'); END IF;

    IF ae->'govBudgetSystem' = 'true'::jsonb THEN ae := jsonb_set(ae, '{govBudgetSystem}', '"yes"'); END IF;
    IF ae->'govBudgetSystem' = 'false'::jsonb THEN ae := jsonb_set(ae, '{govBudgetSystem}', '"no"'); END IF;

    IF ae->'govFinReporting' = 'true'::jsonb THEN ae := jsonb_set(ae, '{govFinReporting}', '"yes"'); END IF;
    IF ae->'govFinReporting' = 'false'::jsonb THEN ae := jsonb_set(ae, '{govFinReporting}', '"no"'); END IF;

    IF ae->'finReportingIntegratedPFM' = 'true'::jsonb THEN ae := jsonb_set(ae, '{finReportingIntegratedPFM}', '"yes"'); END IF;
    IF ae->'finReportingIntegratedPFM' = 'false'::jsonb THEN ae := jsonb_set(ae, '{finReportingIntegratedPFM}', '"no"'); END IF;

    IF ae->'govAudit' = 'true'::jsonb THEN ae := jsonb_set(ae, '{govAudit}', '"yes"'); END IF;
    IF ae->'govAudit' = 'false'::jsonb THEN ae := jsonb_set(ae, '{govAudit}', '"no"'); END IF;

    IF ae->'govProcurement' = 'true'::jsonb THEN ae := jsonb_set(ae, '{govProcurement}', '"yes"'); END IF;
    IF ae->'govProcurement' = 'false'::jsonb THEN ae := jsonb_set(ae, '{govProcurement}', '"no"'); END IF;

    -- Section 3: Predictability
    IF ae->'annualBudgetShared' = 'true'::jsonb THEN ae := jsonb_set(ae, '{annualBudgetShared}', '"yes"'); END IF;
    IF ae->'annualBudgetShared' = 'false'::jsonb THEN ae := jsonb_set(ae, '{annualBudgetShared}', '"no"'); END IF;

    IF ae->'forwardPlanShared' = 'true'::jsonb THEN ae := jsonb_set(ae, '{forwardPlanShared}', '"yes"'); END IF;
    IF ae->'forwardPlanShared' = 'false'::jsonb THEN ae := jsonb_set(ae, '{forwardPlanShared}', '"no"'); END IF;

    IF ae->'multiYearFinancingAgreement' = 'true'::jsonb THEN ae := jsonb_set(ae, '{multiYearFinancingAgreement}', '"yes"'); END IF;
    IF ae->'multiYearFinancingAgreement' = 'false'::jsonb THEN ae := jsonb_set(ae, '{multiYearFinancingAgreement}', '"no"'); END IF;

    -- Section 4: Transparency
    IF ae->'annualFinReportsPublic' = 'true'::jsonb THEN ae := jsonb_set(ae, '{annualFinReportsPublic}', '"yes"'); END IF;
    IF ae->'annualFinReportsPublic' = 'false'::jsonb THEN ae := jsonb_set(ae, '{annualFinReportsPublic}', '"no"'); END IF;

    IF ae->'dataUpdatedPublicly' = 'true'::jsonb THEN ae := jsonb_set(ae, '{dataUpdatedPublicly}', '"yes"'); END IF;
    IF ae->'dataUpdatedPublicly' = 'false'::jsonb THEN ae := jsonb_set(ae, '{dataUpdatedPublicly}', '"no"'); END IF;

    IF ae->'finalEvalPlanned' = 'true'::jsonb THEN ae := jsonb_set(ae, '{finalEvalPlanned}', '"yes"'); END IF;
    IF ae->'finalEvalPlanned' = 'false'::jsonb THEN ae := jsonb_set(ae, '{finalEvalPlanned}', '"no"'); END IF;

    IF ae->'evalReportPublic' = 'true'::jsonb THEN ae := jsonb_set(ae, '{evalReportPublic}', '"yes"'); END IF;
    IF ae->'evalReportPublic' = 'false'::jsonb THEN ae := jsonb_set(ae, '{evalReportPublic}', '"no"'); END IF;

    IF ae->'performanceIndicatorsReported' = 'true'::jsonb THEN ae := jsonb_set(ae, '{performanceIndicatorsReported}', '"yes"'); END IF;
    IF ae->'performanceIndicatorsReported' = 'false'::jsonb THEN ae := jsonb_set(ae, '{performanceIndicatorsReported}', '"no"'); END IF;

    -- Section 5: Mutual Accountability
    IF ae->'jointAnnualReview' = 'true'::jsonb THEN ae := jsonb_set(ae, '{jointAnnualReview}', '"yes"'); END IF;
    IF ae->'jointAnnualReview' = 'false'::jsonb THEN ae := jsonb_set(ae, '{jointAnnualReview}', '"no"'); END IF;

    IF ae->'correctiveActionsDocumented' = 'true'::jsonb THEN ae := jsonb_set(ae, '{correctiveActionsDocumented}', '"yes"'); END IF;
    IF ae->'correctiveActionsDocumented' = 'false'::jsonb THEN ae := jsonb_set(ae, '{correctiveActionsDocumented}', '"no"'); END IF;

    -- Section 6: Civil Society (publicPrivateDialogue only — rest become multi-option)
    IF ae->'publicPrivateDialogue' = 'true'::jsonb THEN ae := jsonb_set(ae, '{publicPrivateDialogue}', '"yes"'); END IF;
    IF ae->'publicPrivateDialogue' = 'false'::jsonb THEN ae := jsonb_set(ae, '{publicPrivateDialogue}', '"no"'); END IF;

    -- Section 7: Gender
    IF ae->'genderBudgetAllocation' = 'true'::jsonb THEN ae := jsonb_set(ae, '{genderBudgetAllocation}', '"yes"'); END IF;
    IF ae->'genderBudgetAllocation' = 'false'::jsonb THEN ae := jsonb_set(ae, '{genderBudgetAllocation}', '"no"'); END IF;

    IF ae->'genderDisaggregatedIndicators' = 'true'::jsonb THEN ae := jsonb_set(ae, '{genderDisaggregatedIndicators}', '"yes"'); END IF;
    IF ae->'genderDisaggregatedIndicators' = 'false'::jsonb THEN ae := jsonb_set(ae, '{genderDisaggregatedIndicators}', '"no"'); END IF;

    -- ===== 4 Country-specific dropdown fields (boolean → positive/negative option) =====

    IF ae->'includedInNationalPlan' = 'true'::jsonb THEN ae := jsonb_set(ae, '{includedInNationalPlan}', '"yes"'); END IF;
    IF ae->'includedInNationalPlan' = 'false'::jsonb THEN ae := jsonb_set(ae, '{includedInNationalPlan}', '"Not included"'); END IF;

    IF ae->'linkedToGovFramework' = 'true'::jsonb THEN ae := jsonb_set(ae, '{linkedToGovFramework}', '"yes"'); END IF;
    IF ae->'linkedToGovFramework' = 'false'::jsonb THEN ae := jsonb_set(ae, '{linkedToGovFramework}', '"Not linked"'); END IF;

    IF ae->'mutualAccountabilityFramework' = 'true'::jsonb THEN ae := jsonb_set(ae, '{mutualAccountabilityFramework}', '"yes"'); END IF;
    IF ae->'mutualAccountabilityFramework' = 'false'::jsonb THEN ae := jsonb_set(ae, '{mutualAccountabilityFramework}', '"Not assessed"'); END IF;

    IF ae->'capacityDevFromNationalPlan' = 'true'::jsonb THEN ae := jsonb_set(ae, '{capacityDevFromNationalPlan}', '"yes"'); END IF;
    IF ae->'capacityDevFromNationalPlan' = 'false'::jsonb THEN ae := jsonb_set(ae, '{capacityDevFromNationalPlan}', '"Not based on national plan"'); END IF;

    -- ===== 5 Hardcoded multi-option fields (boolean → first positive / last negative option) =====

    IF ae->'civilSocietyConsulted' = 'true'::jsonb THEN ae := jsonb_set(ae, '{civilSocietyConsulted}', '"Formal structured"'); END IF;
    IF ae->'civilSocietyConsulted' = 'false'::jsonb THEN ae := jsonb_set(ae, '{civilSocietyConsulted}', '"Not consulted"'); END IF;

    IF ae->'csoInvolvedInImplementation' = 'true'::jsonb THEN ae := jsonb_set(ae, '{csoInvolvedInImplementation}', '"Lead implementer"'); END IF;
    IF ae->'csoInvolvedInImplementation' = 'false'::jsonb THEN ae := jsonb_set(ae, '{csoInvolvedInImplementation}', '"Not involved"'); END IF;

    IF ae->'privateSectorEngaged' = 'true'::jsonb THEN ae := jsonb_set(ae, '{privateSectorEngaged}', '"Governance/oversight"'); END IF;
    IF ae->'privateSectorEngaged' = 'false'::jsonb THEN ae := jsonb_set(ae, '{privateSectorEngaged}', '"Not engaged"'); END IF;

    IF ae->'genderObjectivesIntegrated' = 'true'::jsonb THEN ae := jsonb_set(ae, '{genderObjectivesIntegrated}', '"Principal (GEN-3)"'); END IF;
    IF ae->'genderObjectivesIntegrated' = 'false'::jsonb THEN ae := jsonb_set(ae, '{genderObjectivesIntegrated}', '"Not targeted (GEN-0)"'); END IF;

    IF ae->'coreFlexibleFundingToCSO' = 'true'::jsonb THEN ae := jsonb_set(ae, '{coreFlexibleFundingToCSO}', '"Core/institutional"'); END IF;
    IF ae->'coreFlexibleFundingToCSO' = 'false'::jsonb THEN ae := jsonb_set(ae, '{coreFlexibleFundingToCSO}', '"No funding to CSOs"'); END IF;

    -- Write updated aidEffectiveness back
    updated_general_info := jsonb_set(updated_general_info, '{aidEffectiveness}', ae);

    -- Initialize documents sub-object if it doesn't exist
    IF NOT (ae ? 'documents') THEN
      updated_general_info := jsonb_set(updated_general_info, '{aidEffectiveness,documents}', '{}'::jsonb);
    END IF;

    -- Update the row
    UPDATE activities
    SET general_info = updated_general_info
    WHERE id = r.id;
  END LOOP;
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS migrate_ae_boolean_field(activities, text, text, text);
