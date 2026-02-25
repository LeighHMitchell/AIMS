-- Fix sync_sectors_on_mode_change() trigger function
--
-- The function was incorrectly rewritten in migration 20260120000004 to reference
-- transaction-table columns (use_activity_sectors, uuid, value, activity_id) instead
-- of activities-table columns (sector_allocation_mode, id). This caused a runtime
-- error ("record 'new' has no field 'use_activity_sectors'") whenever the
-- sector_allocation_mode column was updated on the activities table, making it
-- impossible to switch between activity-level and transaction-level sector modes.
--
-- This migration restores the correct logic while keeping SECURITY DEFINER
-- (from the RLS recursion fix) and BIGINT casting (from the integer overflow fix).

CREATE OR REPLACE FUNCTION sync_sectors_on_mode_change()
RETURNS TRIGGER AS $$
DECLARE
  tx RECORD;
BEGIN
  -- Only run if mode changed to 'activity'
  IF OLD.sector_allocation_mode IS DISTINCT FROM NEW.sector_allocation_mode
     AND NEW.sector_allocation_mode = 'activity' THEN

    -- For each transaction in this activity, sync sectors from activity
    FOR tx IN
      SELECT uuid, value FROM transactions WHERE activity_id = NEW.id
    LOOP
      -- Soft delete existing sector lines
      UPDATE transaction_sector_lines
      SET deleted_at = NOW()
      WHERE transaction_id = tx.uuid AND deleted_at IS NULL;

      -- Insert new sector lines based on activity sectors
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
        tx.uuid,
        '1', -- DAC-5 vocabulary
        asec.sector_code,
        asec.sector_name,
        COALESCE(asec.percentage, 100),
        ROUND(COALESCE(tx.value, 0) * COALESCE(asec.percentage, 100) / 100 * 100)::BIGINT,
        NOW(),
        NOW()
      FROM activity_sectors asec
      WHERE asec.activity_id = NEW.id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
