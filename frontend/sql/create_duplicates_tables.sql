-- Create tables for duplicate detection in Data Clinic
-- Run this migration to enable the Duplicates tab functionality

-- ============================================================================
-- Table: detected_duplicates
-- Stores pre-computed duplicate pairs for activities and organizations
-- ============================================================================
CREATE TABLE IF NOT EXISTS detected_duplicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('activity', 'organization')),
  entity_id_1 UUID NOT NULL,
  entity_id_2 UUID NOT NULL,
  detection_type TEXT NOT NULL, -- 'exact_iati_id', 'exact_crs_id', 'exact_name', 'exact_acronym', 'similar_name', 'cross_org'
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  similarity_score NUMERIC(5,4), -- For fuzzy matches, 0.0000-1.0000
  match_details JSONB, -- Store what matched (e.g., {"field": "title", "value1": "...", "value2": "..."})
  is_suggested_link BOOLEAN DEFAULT FALSE, -- True for funder/implementer pairs that should be linked, not merged
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure we don't store the same pair twice (regardless of order)
  CONSTRAINT detected_duplicates_unique_pair UNIQUE (entity_type, entity_id_1, entity_id_2),
  
  -- Ensure entity_id_1 < entity_id_2 to prevent storing A-B and B-A as separate rows
  CONSTRAINT detected_duplicates_ordered_ids CHECK (entity_id_1 < entity_id_2)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_detected_duplicates_entity_type ON detected_duplicates(entity_type);
CREATE INDEX IF NOT EXISTS idx_detected_duplicates_confidence ON detected_duplicates(confidence);
CREATE INDEX IF NOT EXISTS idx_detected_duplicates_detection_type ON detected_duplicates(detection_type);
CREATE INDEX IF NOT EXISTS idx_detected_duplicates_entity_id_1 ON detected_duplicates(entity_id_1);
CREATE INDEX IF NOT EXISTS idx_detected_duplicates_entity_id_2 ON detected_duplicates(entity_id_2);
CREATE INDEX IF NOT EXISTS idx_detected_duplicates_is_suggested_link ON detected_duplicates(is_suggested_link);

-- ============================================================================
-- Table: duplicate_dismissals
-- Tracks user decisions on duplicate pairs (dismissed, linked, merged)
-- ============================================================================
CREATE TABLE IF NOT EXISTS duplicate_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('activity', 'organization')),
  entity_id_1 UUID NOT NULL,
  entity_id_2 UUID NOT NULL,
  dismissed_by UUID REFERENCES users(id),
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT, -- Optional user-provided reason
  action_taken TEXT NOT NULL CHECK (action_taken IN ('not_duplicate', 'linked', 'merged')),
  
  -- Ensure we don't store multiple dismissals for the same pair
  CONSTRAINT duplicate_dismissals_unique_pair UNIQUE (entity_type, entity_id_1, entity_id_2),
  
  -- Ensure entity_id_1 < entity_id_2 for consistency
  CONSTRAINT duplicate_dismissals_ordered_ids CHECK (entity_id_1 < entity_id_2)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_duplicate_dismissals_entity_type ON duplicate_dismissals(entity_type);
CREATE INDEX IF NOT EXISTS idx_duplicate_dismissals_dismissed_by ON duplicate_dismissals(dismissed_by);
CREATE INDEX IF NOT EXISTS idx_duplicate_dismissals_action_taken ON duplicate_dismissals(action_taken);
CREATE INDEX IF NOT EXISTS idx_duplicate_dismissals_entity_id_1 ON duplicate_dismissals(entity_id_1);
CREATE INDEX IF NOT EXISTS idx_duplicate_dismissals_entity_id_2 ON duplicate_dismissals(entity_id_2);

-- ============================================================================
-- Helper function to ensure consistent ordering of entity IDs
-- Always stores the smaller UUID first to prevent A-B / B-A duplicates
-- ============================================================================
CREATE OR REPLACE FUNCTION order_duplicate_ids(id1 UUID, id2 UUID)
RETURNS TABLE(ordered_id_1 UUID, ordered_id_2 UUID) AS $$
BEGIN
  IF id1 < id2 THEN
    RETURN QUERY SELECT id1, id2;
  ELSE
    RETURN QUERY SELECT id2, id1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE detected_duplicates IS 'Pre-computed duplicate pairs for activities and organizations, detected by the duplicate detection job';
COMMENT ON COLUMN detected_duplicates.entity_type IS 'Type of entity: activity or organization';
COMMENT ON COLUMN detected_duplicates.detection_type IS 'How the duplicate was detected: exact_iati_id, exact_crs_id, exact_name, exact_acronym, similar_name, cross_org';
COMMENT ON COLUMN detected_duplicates.confidence IS 'Confidence level: high (exact matches), medium (cross-org), low (fuzzy matches)';
COMMENT ON COLUMN detected_duplicates.similarity_score IS 'For fuzzy matches, the Levenshtein similarity score (0.0000-1.0000)';
COMMENT ON COLUMN detected_duplicates.match_details IS 'JSON details about what matched, e.g., {"field": "title", "value1": "...", "value2": "..."}';
COMMENT ON COLUMN detected_duplicates.is_suggested_link IS 'True if this is a funder/implementer pair that should be linked as related activities rather than merged';

COMMENT ON TABLE duplicate_dismissals IS 'User decisions on duplicate pairs - whether they dismissed, linked, or merged them';
COMMENT ON COLUMN duplicate_dismissals.action_taken IS 'Action taken: not_duplicate (dismissed as false positive), linked (activities linked as related), merged (organizations merged)';

-- ============================================================================
-- Grant permissions (adjust role names as needed for your setup)
-- ============================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON detected_duplicates TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON duplicate_dismissals TO authenticated;

-- ============================================================================
-- Verification queries
-- ============================================================================
-- Run these to verify the tables were created correctly:
-- SELECT * FROM information_schema.tables WHERE table_name IN ('detected_duplicates', 'duplicate_dismissals');
-- SELECT * FROM information_schema.columns WHERE table_name = 'detected_duplicates';
-- SELECT * FROM information_schema.columns WHERE table_name = 'duplicate_dismissals';




