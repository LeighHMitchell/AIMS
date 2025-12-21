-- Create table for storing budget classification lines per transaction
-- Each transaction can have multiple budget lines (one per sector allocation)

CREATE TABLE IF NOT EXISTS transaction_budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(uuid) ON DELETE CASCADE,

  -- Sector reference (for proportional split)
  sector_code TEXT,
  sector_name TEXT,
  sector_percentage NUMERIC(5,2) DEFAULT 100,

  -- Budget classifications (all optional - may be NULL if no mapping exists)
  funding_source_classification_id UUID REFERENCES budget_classifications(id) ON DELETE SET NULL,
  administrative_classification_id UUID REFERENCES budget_classifications(id) ON DELETE SET NULL,
  functional_classification_id UUID REFERENCES budget_classifications(id) ON DELETE SET NULL,
  economic_classification_id UUID REFERENCES budget_classifications(id) ON DELETE SET NULL,
  programme_classification_id UUID REFERENCES budget_classifications(id) ON DELETE SET NULL,
  revenue_classification_id UUID REFERENCES budget_classifications(id) ON DELETE SET NULL,
  liabilities_classification_id UUID REFERENCES budget_classifications(id) ON DELETE SET NULL,

  -- Calculated amount (transaction value * sector percentage / 100)
  amount NUMERIC(15,2),
  currency TEXT,

  -- Override tracking
  is_override BOOLEAN DEFAULT false,
  override_notes TEXT,

  -- Metadata
  inferred_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX idx_txn_budget_lines_transaction ON transaction_budget_lines(transaction_id);
CREATE INDEX idx_txn_budget_lines_sector ON transaction_budget_lines(sector_code);
CREATE INDEX idx_txn_budget_lines_funding_source ON transaction_budget_lines(funding_source_classification_id) WHERE funding_source_classification_id IS NOT NULL;
CREATE INDEX idx_txn_budget_lines_admin ON transaction_budget_lines(administrative_classification_id) WHERE administrative_classification_id IS NOT NULL;
CREATE INDEX idx_txn_budget_lines_functional ON transaction_budget_lines(functional_classification_id) WHERE functional_classification_id IS NOT NULL;
CREATE INDEX idx_txn_budget_lines_economic ON transaction_budget_lines(economic_classification_id) WHERE economic_classification_id IS NOT NULL;
CREATE INDEX idx_txn_budget_lines_programme ON transaction_budget_lines(programme_classification_id) WHERE programme_classification_id IS NOT NULL;
CREATE INDEX idx_txn_budget_lines_revenue ON transaction_budget_lines(revenue_classification_id) WHERE revenue_classification_id IS NOT NULL;
CREATE INDEX idx_txn_budget_lines_liabilities ON transaction_budget_lines(liabilities_classification_id) WHERE liabilities_classification_id IS NOT NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_txn_budget_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_txn_budget_lines_updated_at_trigger
  BEFORE UPDATE ON transaction_budget_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_txn_budget_lines_updated_at();

-- Add comments
COMMENT ON TABLE transaction_budget_lines IS 'Stores inferred and overridden budget classifications for each transaction, split by sector';
COMMENT ON COLUMN transaction_budget_lines.sector_code IS 'DAC sector code for this budget line (NULL if transaction has no sectors)';
COMMENT ON COLUMN transaction_budget_lines.sector_percentage IS 'Percentage of transaction value allocated to this sector (0-100)';
COMMENT ON COLUMN transaction_budget_lines.amount IS 'Calculated amount = transaction_value * sector_percentage / 100';
COMMENT ON COLUMN transaction_budget_lines.is_override IS 'True if user manually overrode any classification in this line';
COMMENT ON COLUMN transaction_budget_lines.inferred_at IS 'Timestamp when classifications were last auto-inferred';

-- Enable RLS
ALTER TABLE transaction_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "txn_budget_lines_select_policy" ON transaction_budget_lines
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "txn_budget_lines_insert_policy" ON transaction_budget_lines
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "txn_budget_lines_update_policy" ON transaction_budget_lines
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "txn_budget_lines_delete_policy" ON transaction_budget_lines
  FOR DELETE TO authenticated
  USING (true);
