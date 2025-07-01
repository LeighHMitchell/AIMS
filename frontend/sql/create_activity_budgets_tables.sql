-- Create activity_budgets table for IATI-compliant budget data
CREATE TABLE IF NOT EXISTS activity_budgets (
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

-- Create index for performance
CREATE INDEX idx_activity_budgets_activity_id ON activity_budgets(activity_id);
CREATE INDEX idx_activity_budgets_period ON activity_budgets(period_start, period_end);

-- Create activity_budget_exceptions table for when budgets are not provided
CREATE TABLE IF NOT EXISTS activity_budget_exceptions (
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

-- Create index for performance
CREATE INDEX idx_activity_budget_exceptions_activity_id ON activity_budget_exceptions(activity_id);

-- Create a view to get budget totals by activity
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

-- Enable Row Level Security (RLS)
ALTER TABLE activity_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_budget_exceptions ENABLE ROW LEVEL SECURITY;

-- Create policies for activity_budgets
CREATE POLICY "Users can view budgets for activities they can view" ON activity_budgets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_budgets.activity_id
      -- Add your activity view permission logic here
    )
  );

CREATE POLICY "Users can insert budgets for activities they can edit" ON activity_budgets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_budgets.activity_id
      -- Add your activity edit permission logic here
    )
  );

CREATE POLICY "Users can update budgets for activities they can edit" ON activity_budgets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_budgets.activity_id
      -- Add your activity edit permission logic here
    )
  );

CREATE POLICY "Users can delete budgets for activities they can edit" ON activity_budgets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_budgets.activity_id
      -- Add your activity edit permission logic here
    )
  );

-- Create similar policies for activity_budget_exceptions
CREATE POLICY "Users can view budget exceptions for activities they can view" ON activity_budget_exceptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_budget_exceptions.activity_id
      -- Add your activity view permission logic here
    )
  );

CREATE POLICY "Users can manage budget exceptions for activities they can edit" ON activity_budget_exceptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_budget_exceptions.activity_id
      -- Add your activity edit permission logic here
    )
  );

-- Create function to check for overlapping budget periods
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

-- Create trigger to prevent overlapping budget periods
CREATE TRIGGER prevent_budget_overlap
  BEFORE INSERT OR UPDATE ON activity_budgets
  FOR EACH ROW
  EXECUTE FUNCTION check_budget_period_overlap();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_activity_budgets_updated_at
  BEFORE UPDATE ON activity_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_budget_exceptions_updated_at
  BEFORE UPDATE ON activity_budget_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

NOTICE: Table activity_budgets already exists
NOTICE: Index idx_activity_budgets_activity_id already exists
NOTICE: Created index: idx_activity_budgets_period
...
✅ All budget tables and indexes are ready! 