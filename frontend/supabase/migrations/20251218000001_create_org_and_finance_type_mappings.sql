-- Create tables for mapping organizations to funding sources and finance types to revenue/liabilities

-- ============================================================================
-- 1. ORGANIZATION FUNDING SOURCE MAPPINGS
-- ============================================================================
-- Maps organizations to funding source classifications (400-500 series)

CREATE TABLE IF NOT EXISTS organization_funding_source_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  budget_classification_id UUID NOT NULL REFERENCES budget_classifications(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Ensure unique mapping per organization
  CONSTRAINT unique_org_funding_source_mapping UNIQUE(organization_id)
);

-- Create indexes
CREATE INDEX idx_org_funding_source_org ON organization_funding_source_mappings(organization_id);
CREATE INDEX idx_org_funding_source_classification ON organization_funding_source_mappings(budget_classification_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_org_funding_source_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_funding_source_mappings_updated_at_trigger
  BEFORE UPDATE ON organization_funding_source_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_org_funding_source_mappings_updated_at();

-- Add comments
COMMENT ON TABLE organization_funding_source_mappings IS 'Maps organizations to funding source classifications';

-- Enable RLS
ALTER TABLE organization_funding_source_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_funding_source_mappings_select_policy" ON organization_funding_source_mappings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "org_funding_source_mappings_insert_policy" ON organization_funding_source_mappings
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "org_funding_source_mappings_update_policy" ON organization_funding_source_mappings
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "org_funding_source_mappings_delete_policy" ON organization_funding_source_mappings
  FOR DELETE TO authenticated
  USING (true);

-- ============================================================================
-- 2. FINANCE TYPE CLASSIFICATION MAPPINGS
-- ============================================================================
-- Maps IATI finance type codes to revenue or liabilities classifications

CREATE TABLE IF NOT EXISTS finance_type_classification_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finance_type_code TEXT NOT NULL,
  finance_type_name TEXT,
  budget_classification_id UUID NOT NULL REFERENCES budget_classifications(id) ON DELETE CASCADE,
  classification_type TEXT NOT NULL CHECK (classification_type IN ('revenue', 'liabilities')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Ensure unique mapping per finance type per classification type
  CONSTRAINT unique_finance_type_mapping UNIQUE(finance_type_code, classification_type)
);

-- Create indexes
CREATE INDEX idx_finance_type_mapping_code ON finance_type_classification_mappings(finance_type_code);
CREATE INDEX idx_finance_type_mapping_classification ON finance_type_classification_mappings(budget_classification_id);
CREATE INDEX idx_finance_type_mapping_type ON finance_type_classification_mappings(classification_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_finance_type_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_finance_type_mappings_updated_at_trigger
  BEFORE UPDATE ON finance_type_classification_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_finance_type_mappings_updated_at();

-- Add comments
COMMENT ON TABLE finance_type_classification_mappings IS 'Maps IATI finance type codes to revenue or liabilities classifications';

-- Enable RLS
ALTER TABLE finance_type_classification_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_type_mappings_select_policy" ON finance_type_classification_mappings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "finance_type_mappings_insert_policy" ON finance_type_classification_mappings
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "finance_type_mappings_update_policy" ON finance_type_classification_mappings
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "finance_type_mappings_delete_policy" ON finance_type_classification_mappings
  FOR DELETE TO authenticated
  USING (true);
