-- Migration: Create organization_funding_envelopes table for organisation-level funding declarations
-- This table stores indicative, organisation-perspective funding information for planning and predictability
-- Data is NOT nationally summable and must be clearly marked as indicative

CREATE TABLE IF NOT EXISTS organization_funding_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Time period (single year or range)
  period_type TEXT NOT NULL CHECK (period_type IN ('single_year', 'multi_year')),
  year_start INTEGER NOT NULL CHECK (year_start >= 1990 AND year_start <= 2100),
  year_end INTEGER CHECK (year_end IS NULL OR (year_end >= year_start AND year_end <= 2100)),
  
  -- Financial data
  amount DECIMAL(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  amount_usd DECIMAL(18,2), -- Converted amount for reference
  
  -- Flow direction
  flow_direction TEXT NOT NULL CHECK (flow_direction IN ('incoming', 'outgoing')),
  
  -- Organisation role (critical field for interpretation)
  organization_role TEXT NOT NULL CHECK (organization_role IN (
    'original_funder', 
    'fund_manager', 
    'implementer'
  )),
  
  -- Funding type flags (stored as array)
  funding_type_flags TEXT[] DEFAULT '{}' CHECK (
    funding_type_flags <@ ARRAY['core_resources', 'earmarked_pooled', 'on_budget', 'off_budget', 'unknown']
  ),
  
  -- Status and confidence
  status TEXT NOT NULL CHECK (status IN ('actual', 'current', 'indicative')),
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  
  -- Notes
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_org_funding_envelope_org_id ON organization_funding_envelopes(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_funding_envelope_status ON organization_funding_envelopes(status);
CREATE INDEX IF NOT EXISTS idx_org_funding_envelope_year ON organization_funding_envelopes(year_start, year_end);
CREATE INDEX IF NOT EXISTS idx_org_funding_envelope_role ON organization_funding_envelopes(organization_role);

-- Version history table for audit trail
CREATE TABLE IF NOT EXISTS organization_funding_envelope_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id UUID NOT NULL REFERENCES organization_funding_envelopes(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
  old_values JSONB,
  new_values JSONB
);

-- Index for history queries
CREATE INDEX IF NOT EXISTS idx_org_funding_envelope_history_envelope ON organization_funding_envelope_history(envelope_id);
CREATE INDEX IF NOT EXISTS idx_org_funding_envelope_history_changed ON organization_funding_envelope_history(changed_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_org_funding_envelope_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_funding_envelope_updated_at
  BEFORE UPDATE ON organization_funding_envelopes
  FOR EACH ROW
  EXECUTE FUNCTION update_org_funding_envelope_updated_at();

-- Add comments
COMMENT ON TABLE organization_funding_envelopes IS 'Organisation-level funding declarations for planning and predictability. Data is indicative and NOT nationally summable.';
COMMENT ON COLUMN organization_funding_envelopes.period_type IS 'single_year: one year only, multi_year: year range';
COMMENT ON COLUMN organization_funding_envelopes.organization_role IS 'Critical field: original_funder (source), fund_manager (channeling), implementer (using funds)';
COMMENT ON COLUMN organization_funding_envelopes.status IS 'actual: historical confirmed, current: current year, indicative: future projections';
COMMENT ON COLUMN organization_funding_envelopes.funding_type_flags IS 'Array of funding type classifications';

-- Enable RLS
ALTER TABLE organization_funding_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_funding_envelope_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_funding_envelopes
-- Anyone can read (for transparency)
CREATE POLICY "Anyone can read funding envelopes" ON organization_funding_envelopes
  FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert funding envelopes" ON organization_funding_envelopes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update
CREATE POLICY "Authenticated users can update funding envelopes" ON organization_funding_envelopes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Authenticated users can delete
CREATE POLICY "Authenticated users can delete funding envelopes" ON organization_funding_envelopes
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for history table
CREATE POLICY "Anyone can read funding envelope history" ON organization_funding_envelope_history
  FOR SELECT USING (true);



