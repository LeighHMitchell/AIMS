-- Migration script to sync existing activity sectors to transaction_sector_lines
-- for activities that are in 'activity' mode

-- This runs after the mode column and triggers are created

-- Step 1: For all activities in 'activity' mode, sync their sectors to transactions
DO $$
DECLARE
  activity_record RECORD;
  tx_record RECORD;
BEGIN
  -- Loop through activities in activity mode that have sectors
  FOR activity_record IN 
    SELECT a.id 
    FROM activities a
    WHERE a.sector_allocation_mode = 'activity'
    AND EXISTS (SELECT 1 FROM activity_sectors asec WHERE asec.activity_id = a.id)
  LOOP
    -- For each transaction in this activity
    FOR tx_record IN 
      SELECT t.uuid, t.value 
      FROM transactions t 
      WHERE t.activity_id = activity_record.id
    LOOP
      -- Skip if transaction already has sector lines
      IF NOT EXISTS (
        SELECT 1 FROM transaction_sector_lines tsl 
        WHERE tsl.transaction_id = tx_record.uuid 
        AND tsl.deleted_at IS NULL
      ) THEN
        -- Insert sector lines from activity sectors
        INSERT INTO transaction_sector_lines (
          transaction_id, 
          sector_vocabulary, 
          sector_code, 
          sector_name, 
          percentage, 
          amount_minor, 
          created_at,
          updated_at
        )
        SELECT 
          tx_record.uuid,
          '1', -- DAC-5 vocabulary
          asec.sector_code,
          asec.sector_name,
          COALESCE(asec.percentage, 100),
          ROUND(COALESCE(tx_record.value, 0) * COALESCE(asec.percentage, 100) / 100 * 100)::INTEGER,
          NOW(),
          NOW()
        FROM activity_sectors asec
        WHERE asec.activity_id = activity_record.id;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Completed syncing activity sectors to transaction_sector_lines for activities in activity mode';
END $$;

-- Step 2: Log migration stats
DO $$
DECLARE
  activity_count INTEGER;
  transaction_count INTEGER;
  sector_line_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT a.id) INTO activity_count
  FROM activities a
  WHERE a.sector_allocation_mode = 'activity';
  
  SELECT COUNT(DISTINCT t.uuid) INTO transaction_count
  FROM transactions t
  JOIN activities a ON t.activity_id = a.id
  WHERE a.sector_allocation_mode = 'activity';
  
  SELECT COUNT(*) INTO sector_line_count
  FROM transaction_sector_lines tsl
  WHERE tsl.deleted_at IS NULL;
  
  RAISE NOTICE 'Migration Stats:';
  RAISE NOTICE '  Activities in activity mode: %', activity_count;
  RAISE NOTICE '  Transactions in those activities: %', transaction_count;
  RAISE NOTICE '  Total transaction_sector_lines: %', sector_line_count;
END $$;


