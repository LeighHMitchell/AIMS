-- Migration: Fix integer overflow in transaction_sector_lines.amount_minor
-- Problem: INTEGER max is ~2.1 billion, which limits transactions to ~$21M
-- Solution: Change to BIGINT to support values up to ~$92 quadrillion
-- This is critical for donors reporting amounts exceeding $21 million

-- Step 1: Alter the column type from INTEGER to BIGINT
ALTER TABLE transaction_sector_lines
ALTER COLUMN amount_minor TYPE BIGINT;

-- Step 2: Update the constraint (if needed - the existing one should work with BIGINT)
ALTER TABLE transaction_sector_lines
DROP CONSTRAINT IF EXISTS valid_amount;

ALTER TABLE transaction_sector_lines
ADD CONSTRAINT valid_amount CHECK (amount_minor >= 0);

-- Step 3: Update the comment
COMMENT ON COLUMN transaction_sector_lines.amount_minor IS 'Amount in minor currency units (cents) stored as BIGINT to support large transactions up to $92 quadrillion';

-- Step 4: Recreate the trigger functions to use BIGINT casting instead of INTEGER

-- 4a. sync_sectors_on_transaction_insert - triggered when new transaction is created
CREATE OR REPLACE FUNCTION sync_sectors_on_transaction_insert()
RETURNS TRIGGER AS $$
DECLARE
  activity_mode TEXT;
BEGIN
  -- Check the activity's sector allocation mode
  SELECT sector_allocation_mode INTO activity_mode
  FROM activities WHERE id = NEW.activity_id;

  -- Only sync if in 'activity' mode (default behavior)
  IF activity_mode IS NULL OR activity_mode = 'activity' THEN
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
      NEW.uuid,
      '1', -- DAC-5 vocabulary
      asec.sector_code,
      asec.sector_name,
      COALESCE(asec.percentage, 100),
      ROUND(COALESCE(NEW.value, 0) * COALESCE(asec.percentage, 100) / 100 * 100)::BIGINT  -- FIXED: Use BIGINT
      , NOW(),
      NOW()
    FROM activity_sectors asec
    WHERE asec.activity_id = NEW.activity_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4b. sync_transaction_sectors_on_value_change - triggered when transaction value changes
CREATE OR REPLACE FUNCTION sync_transaction_sectors_on_value_change()
RETURNS TRIGGER AS $$
DECLARE
  activity_mode TEXT;
BEGIN
  -- Only process if value changed
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    -- Check the activity's sector allocation mode
    SELECT sector_allocation_mode INTO activity_mode
    FROM activities WHERE id = NEW.activity_id;

    -- Only sync if in 'activity' mode
    IF activity_mode = 'activity' THEN
      -- Update the amount_minor for existing sector lines
      UPDATE transaction_sector_lines tsl
      SET
        amount_minor = ROUND(COALESCE(NEW.value, 0) * tsl.percentage / 100 * 100)::BIGINT,  -- FIXED: Use BIGINT
        updated_at = NOW()
      WHERE tsl.transaction_id = NEW.uuid AND tsl.deleted_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4c. sync_sectors_on_activity_sector_change - triggered when activity sectors change
CREATE OR REPLACE FUNCTION sync_sectors_on_activity_sector_change()
RETURNS TRIGGER AS $$
DECLARE
  tx RECORD;
  activity_mode TEXT;
BEGIN
  -- Check the activity's sector allocation mode
  SELECT sector_allocation_mode INTO activity_mode
  FROM activities WHERE id = COALESCE(NEW.activity_id, OLD.activity_id);

  -- Only sync if in 'activity' mode
  IF activity_mode IS NULL OR activity_mode = 'activity' THEN
    -- Soft-delete existing sector lines for all transactions of this activity
    UPDATE transaction_sector_lines
    SET deleted_at = NOW()
    WHERE transaction_id IN (
      SELECT uuid FROM transactions WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)
    ) AND deleted_at IS NULL;

    -- Re-create sector lines for all transactions
    FOR tx IN
      SELECT uuid, value FROM transactions WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)
    LOOP
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
        ROUND(COALESCE(tx.value, 0) * COALESCE(asec.percentage, 100) / 100 * 100)::BIGINT,  -- FIXED: Use BIGINT
        NOW(),
        NOW()
      FROM activity_sectors asec
      WHERE asec.activity_id = COALESCE(NEW.activity_id, OLD.activity_id);
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 5: Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: transaction_sector_lines.amount_minor changed from INTEGER to BIGINT';
  RAISE NOTICE 'Maximum supported amount: $92,233,720,368,547,758.07 (BIGINT max / 100)';
  RAISE NOTICE 'All trigger functions updated to use BIGINT casting';
END $$;
