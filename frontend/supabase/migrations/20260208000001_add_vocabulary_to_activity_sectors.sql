-- Add sector_vocabulary column to support non-DAC vocabularies
ALTER TABLE activity_sectors ADD COLUMN IF NOT EXISTS sector_vocabulary TEXT DEFAULT '1';

-- Drop old unique constraint and create new one that includes vocabulary
ALTER TABLE activity_sectors DROP CONSTRAINT IF EXISTS activity_sectors_activity_id_sector_code_key;
ALTER TABLE activity_sectors ADD CONSTRAINT activity_sectors_activity_id_sector_code_vocab_key
  UNIQUE(activity_id, sector_code, sector_vocabulary);

-- Index for vocabulary lookups
CREATE INDEX IF NOT EXISTS idx_activity_sectors_vocabulary ON activity_sectors(sector_vocabulary);
