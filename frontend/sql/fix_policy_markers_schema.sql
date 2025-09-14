-- Fix Policy Markers Schema Issues
-- This script addresses database schema inconsistencies for IATI policy markers

-- =====================================================
-- STEP 1: Update marker_type constraint to include 'custom'
-- =====================================================

-- Drop existing constraint
ALTER TABLE policy_markers DROP CONSTRAINT IF EXISTS policy_markers_marker_type_check;

-- Add new constraint that includes 'custom' type
ALTER TABLE policy_markers ADD CONSTRAINT policy_markers_marker_type_check 
  CHECK (marker_type IN ('environmental', 'social_governance', 'other', 'custom'));

-- =====================================================
-- STEP 2: Ensure activity_policy_markers uses 'significance' column
-- =====================================================

-- Check if score column exists and rename it if needed
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'activity_policy_markers' 
               AND column_name = 'score') THEN
        -- Rename score to significance
        ALTER TABLE activity_policy_markers RENAME COLUMN score TO significance;
        
        -- Update constraint name
        ALTER TABLE activity_policy_markers DROP CONSTRAINT IF EXISTS activity_policy_markers_score_check;
        ALTER TABLE activity_policy_markers ADD CONSTRAINT activity_policy_markers_significance_check 
          CHECK (significance IN (0, 1, 2, 3, 4));
          
        RAISE NOTICE 'Renamed score column to significance';
    ELSE
        RAISE NOTICE 'Score column not found, significance column likely already exists';
    END IF;
END $$;

-- =====================================================
-- STEP 3: Add missing IATI columns to policy_markers if needed
-- =====================================================

-- Add IATI-compliant columns if they don't exist
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS vocabulary TEXT DEFAULT '1';
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS vocabulary_uri TEXT;
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS iati_code TEXT;
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS is_iati_standard BOOLEAN DEFAULT false;

-- =====================================================
-- STEP 4: Create indexes for better performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_policy_markers_vocabulary ON policy_markers(vocabulary);
CREATE INDEX IF NOT EXISTS idx_policy_markers_iati_code ON policy_markers(iati_code);
CREATE INDEX IF NOT EXISTS idx_policy_markers_is_iati_standard ON policy_markers(is_iati_standard);
CREATE INDEX IF NOT EXISTS idx_policy_markers_marker_type ON policy_markers(marker_type);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify constraint update
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE table_name = 'policy_markers' 
AND constraint_name LIKE '%marker_type%';

-- Verify column structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name IN ('policy_markers', 'activity_policy_markers')
ORDER BY table_name, ordinal_position;

-- Show current policy markers
SELECT code, name, marker_type, vocabulary, iati_code, is_iati_standard 
FROM policy_markers 
ORDER BY is_iati_standard DESC, display_order ASC;

