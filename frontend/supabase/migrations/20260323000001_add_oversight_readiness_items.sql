-- Add auto-check column to readiness_checklist_items for items that auto-complete from live data
ALTER TABLE readiness_checklist_items
  ADD COLUMN IF NOT EXISTS auto_check_type TEXT DEFAULT NULL;

COMMENT ON COLUMN readiness_checklist_items.auto_check_type IS
  'If set, this item auto-completes based on live data queries. Values: mou_uploaded, gov_ministry_assigned, signing_agency_recorded, endorsement_complete';

-- Create a new "Oversight & Governance" stage for auto-check items
INSERT INTO readiness_checklist_templates (code, name, description, stage_order, is_active)
VALUES (
  'OVERSIGHT_GOV',
  'Oversight & Governance',
  'Automated checks for governance requirements — these items are completed automatically when the relevant data exists elsewhere in the system.',
  1,  -- First stage so it appears at the top
  true
)
ON CONFLICT (code) DO NOTHING;

-- Get the template ID for the new stage
DO $$
DECLARE
  template_uuid UUID;
BEGIN
  SELECT id INTO template_uuid FROM readiness_checklist_templates WHERE code = 'OVERSIGHT_GOV';

  IF template_uuid IS NOT NULL THEN
    -- Insert auto-check items
    INSERT INTO readiness_checklist_items (template_id, code, title, description, guidance_text, responsible_agency_type, display_order, is_required, is_active, applicable_conditions, auto_check_type)
    VALUES
      (template_uuid, 'OG-01', 'MOU/Agreement Uploaded',
       'A Memorandum of Understanding or formal agreement document has been uploaded to the activity.',
       'Upload an MOU or agreement document in the Documents & Images tab with category "Memorandum of Understanding" (A09).',
       'Government', 1, true, true, '{}', 'mou_uploaded'),

      (template_uuid, 'OG-02', 'Government Ministry Assigned',
       'A government ministry or department has been assigned as a participating organization.',
       'Add a government organization in the Participating Organizations section with the "Government" role.',
       'Government', 2, true, true, '{}', 'gov_ministry_assigned'),

      (template_uuid, 'OG-03', 'Signing Agency Recorded',
       'An extending/funding organization has been recorded as a participating organization.',
       'Add the extending organization in the Participating Organizations section.',
       'Development Partner', 3, false, true, '{}', 'signing_agency_recorded'),

      (template_uuid, 'OG-04', 'Government Endorsement Complete',
       'The government has formally validated this activity through the endorsement process.',
       'Complete the endorsement section in the Readiness Checklist with a "Validated" status.',
       'Government', 4, true, true, '{}', 'endorsement_complete')
    ON CONFLICT (template_id, code) DO NOTHING;
  END IF;
END $$;

-- Bump existing stage orders to make room for the new stage at position 1
UPDATE readiness_checklist_templates
SET stage_order = stage_order + 1
WHERE code != 'OVERSIGHT_GOV' AND stage_order >= 1;
