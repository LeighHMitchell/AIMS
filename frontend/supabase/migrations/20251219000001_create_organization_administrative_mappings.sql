-- Create table for mapping receiver organizations to administrative classifications
-- Maps government ministries/agencies to their administrative budget codes

CREATE TABLE IF NOT EXISTS organization_administrative_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  budget_classification_id UUID NOT NULL REFERENCES budget_classifications(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Ensure unique mapping per organization
  CONSTRAINT unique_org_administrative_mapping UNIQUE(organization_id)
);

-- Create indexes
CREATE INDEX idx_org_admin_mapping_org ON organization_administrative_mappings(organization_id);
CREATE INDEX idx_org_admin_mapping_classification ON organization_administrative_mappings(budget_classification_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_org_admin_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_admin_mappings_updated_at_trigger
  BEFORE UPDATE ON organization_administrative_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_org_admin_mappings_updated_at();

-- Add comments
COMMENT ON TABLE organization_administrative_mappings IS 'Maps receiver organizations (government ministries) to administrative budget classifications';
COMMENT ON COLUMN organization_administrative_mappings.organization_id IS 'The organization (typically a government ministry/agency) to map';
COMMENT ON COLUMN organization_administrative_mappings.budget_classification_id IS 'The administrative budget classification code';

-- Enable RLS
ALTER TABLE organization_administrative_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_admin_mappings_select_policy" ON organization_administrative_mappings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "org_admin_mappings_insert_policy" ON organization_administrative_mappings
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "org_admin_mappings_update_policy" ON organization_administrative_mappings
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "org_admin_mappings_delete_policy" ON organization_administrative_mappings
  FOR DELETE TO authenticated
  USING (true);
