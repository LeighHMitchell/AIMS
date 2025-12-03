-- Create triggers to sync activity sectors to transaction_sector_lines
-- These triggers ensure that when in 'activity' mode, all transactions
-- automatically inherit the activity's sector breakdown

-- Function to sync activity sectors to all transactions when activity sectors change
CREATE OR REPLACE FUNCTION sync_activity_sectors_to_transactions()
RETURNS TRIGGER AS $$
DECLARE
  activity_mode TEXT;
  tx RECORD;
BEGIN
  -- Get the activity's sector allocation mode
  SELECT sector_allocation_mode INTO activity_mode
  FROM activities WHERE id = COALESCE(NEW.activity_id, OLD.activity_id);
  
  -- Only sync if in 'activity' mode
  IF activity_mode = 'activity' THEN
    -- For each transaction in this activity, update its sector lines
    FOR tx IN 
      SELECT uuid, value FROM transactions 
      WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)
    LOOP
      -- Delete existing sector lines for this transaction (soft delete)
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
        ROUND(COALESCE(tx.value, 0) * COALESCE(asec.percentage, 100) / 100 * 100)::INTEGER, -- convert to cents
        NOW(),
        NOW()
      FROM activity_sectors asec
      WHERE asec.activity_id = COALESCE(NEW.activity_id, OLD.activity_id);
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for INSERT on activity_sectors
DROP TRIGGER IF EXISTS trg_sync_activity_sectors_insert ON activity_sectors;
CREATE TRIGGER trg_sync_activity_sectors_insert
AFTER INSERT ON activity_sectors
FOR EACH ROW EXECUTE FUNCTION sync_activity_sectors_to_transactions();

-- Trigger for UPDATE on activity_sectors
DROP TRIGGER IF EXISTS trg_sync_activity_sectors_update ON activity_sectors;
CREATE TRIGGER trg_sync_activity_sectors_update
AFTER UPDATE ON activity_sectors
FOR EACH ROW EXECUTE FUNCTION sync_activity_sectors_to_transactions();

-- Trigger for DELETE on activity_sectors
DROP TRIGGER IF EXISTS trg_sync_activity_sectors_delete ON activity_sectors;
CREATE TRIGGER trg_sync_activity_sectors_delete
AFTER DELETE ON activity_sectors
FOR EACH ROW EXECUTE FUNCTION sync_activity_sectors_to_transactions();


-- Function to sync sectors when a new transaction is created
CREATE OR REPLACE FUNCTION sync_sectors_on_transaction_insert()
RETURNS TRIGGER AS $$
DECLARE
  activity_mode TEXT;
BEGIN
  -- Get the activity's sector allocation mode
  SELECT sector_allocation_mode INTO activity_mode
  FROM activities WHERE id = NEW.activity_id;
  
  -- Only sync if in 'activity' mode
  IF activity_mode = 'activity' THEN
    -- Insert sector lines based on activity sectors
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
      ROUND(COALESCE(NEW.value, 0) * COALESCE(asec.percentage, 100) / 100 * 100)::INTEGER
      , NOW(),
      NOW()
    FROM activity_sectors asec
    WHERE asec.activity_id = NEW.activity_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new transactions
DROP TRIGGER IF EXISTS trg_sync_sectors_on_transaction_insert ON transactions;
CREATE TRIGGER trg_sync_sectors_on_transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION sync_sectors_on_transaction_insert();


-- Function to sync sectors when transaction value changes (in activity mode)
CREATE OR REPLACE FUNCTION sync_sectors_on_transaction_update()
RETURNS TRIGGER AS $$
DECLARE
  activity_mode TEXT;
BEGIN
  -- Only run if value changed
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    -- Get the activity's sector allocation mode
    SELECT sector_allocation_mode INTO activity_mode
    FROM activities WHERE id = NEW.activity_id;
    
    -- Only sync if in 'activity' mode
    IF activity_mode = 'activity' THEN
      -- Update the amount_minor for existing sector lines
      UPDATE transaction_sector_lines tsl
      SET 
        amount_minor = ROUND(COALESCE(NEW.value, 0) * tsl.percentage / 100 * 100)::INTEGER,
        updated_at = NOW()
      WHERE tsl.transaction_id = NEW.uuid AND tsl.deleted_at IS NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for transaction value updates
DROP TRIGGER IF EXISTS trg_sync_sectors_on_transaction_update ON transactions;
CREATE TRIGGER trg_sync_sectors_on_transaction_update
AFTER UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION sync_sectors_on_transaction_update();


-- Function to sync all transactions when mode changes to 'activity'
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
        '1',
        asec.sector_code,
        asec.sector_name,
        COALESCE(asec.percentage, 100),
        ROUND(COALESCE(tx.value, 0) * COALESCE(asec.percentage, 100) / 100 * 100)::INTEGER,
        NOW(),
        NOW()
      FROM activity_sectors asec
      WHERE asec.activity_id = NEW.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for mode changes on activities
DROP TRIGGER IF EXISTS trg_sync_sectors_on_mode_change ON activities;
CREATE TRIGGER trg_sync_sectors_on_mode_change
AFTER UPDATE ON activities
FOR EACH ROW EXECUTE FUNCTION sync_sectors_on_mode_change();


-- Add helpful comments
COMMENT ON FUNCTION sync_activity_sectors_to_transactions() IS 
  'Syncs activity sector allocations to all transaction_sector_lines when activity sectors are modified (only in activity mode)';

COMMENT ON FUNCTION sync_sectors_on_transaction_insert() IS 
  'Automatically populates transaction_sector_lines when a new transaction is created (only in activity mode)';

COMMENT ON FUNCTION sync_sectors_on_transaction_update() IS 
  'Updates transaction_sector_lines amounts when transaction value changes (only in activity mode)';

COMMENT ON FUNCTION sync_sectors_on_mode_change() IS 
  'Syncs all transaction_sector_lines from activity_sectors when mode changes to activity';


