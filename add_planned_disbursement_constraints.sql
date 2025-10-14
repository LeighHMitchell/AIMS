-- ================================================================
-- PLANNED DISBURSEMENTS: ADD DATA INTEGRITY CONSTRAINTS
-- ================================================================
-- This migration adds missing data integrity constraints to ensure
-- IATI compliance and prevent invalid data from being inserted
-- Safe to run multiple times (uses IF NOT EXISTS patterns)
-- ================================================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PLANNED DISBURSEMENTS CONSTRAINTS MIGRATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Add type validation constraint (1=Original, 2=Revised, or NULL)
  BEGIN
    ALTER TABLE planned_disbursements
      ADD CONSTRAINT planned_disbursements_type_check 
      CHECK (type IS NULL OR type IN ('1', '2'));
    RAISE NOTICE '✅ Added constraint: planned_disbursements_type_check';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'ℹ️  Constraint planned_disbursements_type_check already exists';
  END;

  -- Add amount validation constraint (must be non-negative)
  BEGIN
    ALTER TABLE planned_disbursements
      ADD CONSTRAINT planned_disbursements_amount_check 
      CHECK (amount >= 0);
    RAISE NOTICE '✅ Added constraint: planned_disbursements_amount_check';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'ℹ️  Constraint planned_disbursements_amount_check already exists';
  END;

  -- Add period validation constraint (end must be after start)
  BEGIN
    ALTER TABLE planned_disbursements
      ADD CONSTRAINT planned_disbursements_valid_period_check 
      CHECK (period_end > period_start);
    RAISE NOTICE '✅ Added constraint: planned_disbursements_valid_period_check';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'ℹ️  Constraint planned_disbursements_valid_period_check already exists';
  END;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Constraints migration completed successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'These constraints ensure:';
  RAISE NOTICE '  - Type is 1 (Original) or 2 (Revised) if provided';
  RAISE NOTICE '  - Amount is always non-negative';
  RAISE NOTICE '  - Period end date is always after period start date';
  RAISE NOTICE '';
END $$;

-- Add documentation comments
COMMENT ON CONSTRAINT planned_disbursements_type_check ON planned_disbursements IS 
  'Ensures type is either 1 (Original) or 2 (Revised) per IATI BudgetType codelist, or NULL if not specified';

COMMENT ON CONSTRAINT planned_disbursements_amount_check ON planned_disbursements IS 
  'Ensures disbursement amount is non-negative (IATI compliance)';

COMMENT ON CONSTRAINT planned_disbursements_valid_period_check ON planned_disbursements IS 
  'Ensures period_end is after period_start (IATI compliance)';

-- Verification Query
SELECT 
  'planned_disbursements' as table_name,
  constraint_name,
  check_clause as constraint_definition
FROM information_schema.check_constraints
WHERE constraint_schema = 'public' 
  AND constraint_name LIKE 'planned_disbursements_%_check'
ORDER BY constraint_name;

