-- Direct column renames for IATI compliance
-- This script directly renames columns if they exist

-- 1. Rename iati_id to iati_identifier
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'iati_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'iati_identifier') THEN
    ALTER TABLE activities RENAME COLUMN iati_id TO iati_identifier;
  END IF;
END $$;

-- 2. Rename title to title_narrative  
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'title')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'title_narrative') THEN
    ALTER TABLE activities RENAME COLUMN title TO title_narrative;
  END IF;
END $$;

-- 3. Rename description to description_narrative
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'description')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'description_narrative') THEN
    ALTER TABLE activities RENAME COLUMN description TO description_narrative;
  END IF;
END $$;

-- 4. Rename tied_status to default_tied_status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'tied_status')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'default_tied_status') THEN
    ALTER TABLE activities RENAME COLUMN tied_status TO default_tied_status;
  END IF;
END $$;

-- 5. Rename partner_id to other_identifier
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'partner_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'other_identifier') THEN
    ALTER TABLE activities RENAME COLUMN partner_id TO other_identifier;
  END IF;
END $$;

-- 6. Verify renames
SELECT 
  'Rename Status' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'iati_identifier') THEN '✓' ELSE '✗' END as iati_identifier,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'title_narrative') THEN '✓' ELSE '✗' END as title_narrative,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'description_narrative') THEN '✓' ELSE '✗' END as description_narrative,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'default_tied_status') THEN '✓' ELSE '✗' END as default_tied_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'other_identifier') THEN '✓' ELSE '✗' END as other_identifier; 