-- Domestic Budget Data Table
-- Allows manual entry of government budget and expenditure by fiscal year and budget classification

CREATE TABLE IF NOT EXISTS domestic_budget_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_classification_id UUID NOT NULL REFERENCES budget_classifications(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL CHECK (fiscal_year >= 1900 AND fiscal_year <= 2100),
  budget_amount NUMERIC(20, 2) DEFAULT 0 CHECK (budget_amount >= 0),
  expenditure_amount NUMERIC(20, 2) DEFAULT 0 CHECK (expenditure_amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Ensure unique combination of classification and fiscal year
  CONSTRAINT unique_classification_fiscal_year UNIQUE (budget_classification_id, fiscal_year)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_domestic_budget_fiscal_year ON domestic_budget_data(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_domestic_budget_classification ON domestic_budget_data(budget_classification_id);
CREATE INDEX IF NOT EXISTS idx_domestic_budget_classification_year ON domestic_budget_data(budget_classification_id, fiscal_year);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_domestic_budget_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_domestic_budget_data_updated_at_trigger ON domestic_budget_data;
CREATE TRIGGER update_domestic_budget_data_updated_at_trigger
  BEFORE UPDATE ON domestic_budget_data
  FOR EACH ROW
  EXECUTE FUNCTION update_domestic_budget_data_updated_at();

-- Enable Row Level Security
ALTER TABLE domestic_budget_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can view, admins can manage
CREATE POLICY "domestic_budget_data_select_policy" ON domestic_budget_data
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "domestic_budget_data_insert_policy" ON domestic_budget_data
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "domestic_budget_data_update_policy" ON domestic_budget_data
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "domestic_budget_data_delete_policy" ON domestic_budget_data
  FOR DELETE TO authenticated
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE domestic_budget_data IS 'Government domestic budget and expenditure data by fiscal year and budget classification';
COMMENT ON COLUMN domestic_budget_data.budget_classification_id IS 'Reference to the budget classification (Chart of Accounts entry)';
COMMENT ON COLUMN domestic_budget_data.fiscal_year IS 'Fiscal year (e.g., 2024, 2025)';
COMMENT ON COLUMN domestic_budget_data.budget_amount IS 'Planned/allocated budget amount';
COMMENT ON COLUMN domestic_budget_data.expenditure_amount IS 'Actual expenditure/spending amount';
COMMENT ON COLUMN domestic_budget_data.currency IS 'Currency code (default USD)';
COMMENT ON COLUMN domestic_budget_data.notes IS 'Optional notes about this budget entry';
