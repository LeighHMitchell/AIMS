-- Safe migration script for activity budgets (checks for existing objects)

-- Create activity_budgets table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_budgets') THEN
    CREATE TABLE activity_budgets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      type SMALLINT NOT NULL CHECK (type IN (1, 2)), -- 1 = Original, 2 = Revised
      status SMALLINT NOT NULL CHECK (status IN (1, 2)), -- 1 = Indicative, 2 = Committed
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      value NUMERIC(20, 2) NOT NULL CHECK (value >= 0),
      currency VARCHAR(3) NOT NULL,
      value_date DATE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id),
      updated_by UUID REFERENCES auth.users(id),
      
      -- Ensure period_end is after period_start
      CONSTRAINT valid_period CHECK (period_end > period_start),
      -- Ensure period is not longer than 1 year
      CONSTRAINT period_max_one_year CHECK (period_end <= period_start + INTERVAL '1 year')
    );
    RAISE NOTICE 'Created table: activity_budgets';
  ELSE
    RAISE NOTICE 'Table activity_budgets already exists';
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_budgets_activity_id') THEN
    CREATE INDEX idx_activity_budgets_activity_id ON activity_budgets(activity_id);
    RAISE NOTICE 'Created index: idx_activity_budgets_activity_id';
  ELSE
    RAISE NOTICE 'Index idx_activity_budgets_activity_id already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_budgets_period') THEN
    CREATE INDEX idx_activity_budgets_period ON activity_budgets(period_start, period_end);
    RAISE NOTICE 'Created index: idx_activity_budgets_period';
  ELSE
    RAISE NOTICE 'Index idx_activity_budgets_period already exists';
  END IF;
END $$;

-- Create activity_budget_exceptions table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_budget_exceptions') THEN
    CREATE TABLE activity_budget_exceptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id),
      updated_by UUID REFERENCES auth.users(id),
      
      -- Ensure only one exception per activity
      CONSTRAINT unique_activity_exception UNIQUE (activity_id)
    );
    RAISE NOTICE 'Created table: activity_budget_exceptions';
  ELSE
    RAISE NOTICE 'Table activity_budget_exceptions already exists';
  END IF;
END $$;

-- Create index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_activity_budget_exceptions_activity_id') THEN
    CREATE INDEX idx_activity_budget_exceptions_activity_id ON activity_budget_exceptions(activity_id);
    RAISE NOTICE 'Created index: idx_activity_budget_exceptions_activity_id';
  ELSE
    RAISE NOTICE 'Index idx_activity_budget_exceptions_activity_id already exists';
  END IF;
END $$;

-- Create or replace view (safe to run multiple times)
CREATE OR REPLACE VIEW activity_budget_totals AS
SELECT 
  activity_id,
  SUM(CASE WHEN type = 2 THEN value ELSE 0 END) as revised_total,
  SUM(CASE WHEN type = 1 THEN value ELSE 0 END) as original_total,
  -- Use revised if available, otherwise original
  CASE 
    WHEN SUM(CASE WHEN type = 2 THEN value ELSE 0 END) > 0 
    THEN SUM(CASE WHEN type = 2 THEN value ELSE 0 END)
    ELSE SUM(CASE WHEN type = 1 THEN value ELSE 0 END)
  END as total_budget,
  COUNT(*) as budget_count,
  MIN(period_start) as earliest_period,
  MAX(period_end) as latest_period
FROM activity_budgets
GROUP BY activity_id;

-- Enable RLS if not already enabled
DO $$
BEGIN
  -- Check and enable RLS for activity_budgets
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables t
    JOIN pg_policies p ON t.tablename = p.tablename
    WHERE t.tablename = 'activity_budgets' AND t.schemaname = 'public'
    AND p.policyname = 'Users can view budgets for activities they can view'
  ) THEN
    ALTER TABLE activity_budgets ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS for activity_budgets';
  END IF;
  
  -- Check and enable RLS for activity_budget_exceptions
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables t
    JOIN pg_policies p ON t.tablename = p.tablename
    WHERE t.tablename = 'activity_budget_exceptions' AND t.schemaname = 'public'
    AND p.policyname = 'Users can view budget exceptions for activities they can view'
  ) THEN
    ALTER TABLE activity_budget_exceptions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS for activity_budget_exceptions';
  END IF;
END $$;

-- Create policies if they don't exist
DO $$
BEGIN
  -- Policies for activity_budgets
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_budgets' 
    AND policyname = 'Users can view budgets for activities they can view'
  ) THEN
    CREATE POLICY "Users can view budgets for activities they can view" ON activity_budgets
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM activities a
          WHERE a.id = activity_budgets.activity_id
        )
      );
    RAISE NOTICE 'Created policy: Users can view budgets for activities they can view';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_budgets' 
    AND policyname = 'Users can insert budgets for activities they can edit'
  ) THEN
    CREATE POLICY "Users can insert budgets for activities they can edit" ON activity_budgets
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM activities a
          WHERE a.id = activity_budgets.activity_id
        )
      );
    RAISE NOTICE 'Created policy: Users can insert budgets for activities they can edit';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_budgets' 
    AND policyname = 'Users can update budgets for activities they can edit'
  ) THEN
    CREATE POLICY "Users can update budgets for activities they can edit" ON activity_budgets
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM activities a
          WHERE a.id = activity_budgets.activity_id
        )
      );
    RAISE NOTICE 'Created policy: Users can update budgets for activities they can edit';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_budgets' 
    AND policyname = 'Users can delete budgets for activities they can edit'
  ) THEN
    CREATE POLICY "Users can delete budgets for activities they can edit" ON activity_budgets
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM activities a
          WHERE a.id = activity_budgets.activity_id
        )
      );
    RAISE NOTICE 'Created policy: Users can delete budgets for activities they can edit';
  END IF;

  -- Policies for activity_budget_exceptions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_budget_exceptions' 
    AND policyname = 'Users can view budget exceptions for activities they can view'
  ) THEN
    CREATE POLICY "Users can view budget exceptions for activities they can view" ON activity_budget_exceptions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM activities a
          WHERE a.id = activity_budget_exceptions.activity_id
        )
      );
    RAISE NOTICE 'Created policy: Users can view budget exceptions for activities they can view';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_budget_exceptions' 
    AND policyname = 'Users can manage budget exceptions for activities they can edit'
  ) THEN
    CREATE POLICY "Users can manage budget exceptions for activities they can edit" ON activity_budget_exceptions
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM activities a
          WHERE a.id = activity_budget_exceptions.activity_id
        )
      );
    RAISE NOTICE 'Created policy: Users can manage budget exceptions for activities they can edit';
  END IF;
END $$;

-- Create or replace functions (safe to run multiple times)
CREATE OR REPLACE FUNCTION check_budget_period_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM activity_budgets
    WHERE activity_id = NEW.activity_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (NEW.period_start, NEW.period_end) OVERLAPS (period_start, period_end)
      )
  ) THEN
    RAISE EXCEPTION 'Budget periods cannot overlap for the same activity';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'prevent_budget_overlap'
  ) THEN
    CREATE TRIGGER prevent_budget_overlap
      BEFORE INSERT OR UPDATE ON activity_budgets
      FOR EACH ROW
      EXECUTE FUNCTION check_budget_period_overlap();
    RAISE NOTICE 'Created trigger: prevent_budget_overlap';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_activity_budgets_updated_at'
  ) THEN
    CREATE TRIGGER update_activity_budgets_updated_at
      BEFORE UPDATE ON activity_budgets
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE 'Created trigger: update_activity_budgets_updated_at';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_activity_budget_exceptions_updated_at'
  ) THEN
    CREATE TRIGGER update_activity_budget_exceptions_updated_at
      BEFORE UPDATE ON activity_budget_exceptions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE 'Created trigger: update_activity_budget_exceptions_updated_at';
  END IF;
END $$;

-- Final status check
DO $$
DECLARE
  tables_count INTEGER;
  indexes_count INTEGER;
  policies_count INTEGER;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO tables_count 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('activity_budgets', 'activity_budget_exceptions');
  
  -- Count indexes
  SELECT COUNT(*) INTO indexes_count 
  FROM pg_indexes 
  WHERE schemaname = 'public' 
  AND indexname IN ('idx_activity_budgets_activity_id', 'idx_activity_budgets_period', 'idx_activity_budget_exceptions_activity_id');
  
  -- Count policies
  SELECT COUNT(*) INTO policies_count 
  FROM pg_policies 
  WHERE tablename IN ('activity_budgets', 'activity_budget_exceptions');
  
  RAISE NOTICE '';
  RAISE NOTICE '=== Migration Summary ===';
  RAISE NOTICE 'Tables created: % of 2', tables_count;
  RAISE NOTICE 'Indexes created: % of 3', indexes_count;
  RAISE NOTICE 'Policies created: % of 6', policies_count;
  RAISE NOTICE '========================';
  RAISE NOTICE '';
  
  IF tables_count = 2 AND indexes_count = 3 THEN
    RAISE NOTICE '✅ All budget tables and indexes are ready!';
  ELSE
    RAISE WARNING '⚠️  Some objects may be missing. Please check the output above.';
  END IF;
END $$; 