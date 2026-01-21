-- Create organization_documents table for IATI document links
CREATE TABLE IF NOT EXISTS organization_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Core document link info
  url TEXT NOT NULL,
  format TEXT,
  document_date DATE,

  -- IATI multi-language fields stored as JSONB
  titles JSONB DEFAULT '[]'::jsonb,  -- [{narrative: string, language?: string}]
  descriptions JSONB DEFAULT '[]'::jsonb,  -- [{narrative: string, language?: string}]

  -- Categories (array of IATI document category codes)
  categories TEXT[] DEFAULT '{}',

  -- Languages the document is available in
  languages TEXT[] DEFAULT '{en}',

  -- Recipient countries for this document
  recipient_countries JSONB DEFAULT '[]'::jsonb,  -- [{code: string, narrative?: string, language?: string}]

  -- Sort order for display
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_organization_documents_org_id ON organization_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_documents_categories ON organization_documents USING GIN(categories);

-- Enable RLS
ALTER TABLE organization_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view organization documents" ON organization_documents;
DROP POLICY IF EXISTS "Authenticated users can insert organization documents" ON organization_documents;
DROP POLICY IF EXISTS "Authenticated users can update organization documents" ON organization_documents;
DROP POLICY IF EXISTS "Authenticated users can delete organization documents" ON organization_documents;

CREATE POLICY "Anyone can view organization documents"
  ON organization_documents FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert organization documents"
  ON organization_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update organization documents"
  ON organization_documents FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete organization documents"
  ON organization_documents FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_organization_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organization_documents_updated_at ON organization_documents;
CREATE TRIGGER update_organization_documents_updated_at
  BEFORE UPDATE ON organization_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_documents_updated_at();

-- Create organization_budgets table for IATI budgets
CREATE TABLE IF NOT EXISTS organization_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Budget type: total, recipient-org, recipient-country, recipient-region
  budget_type TEXT NOT NULL CHECK (budget_type IN ('total', 'recipient-org', 'recipient-country', 'recipient-region')),

  -- Budget status: 1=indicative, 2=committed
  budget_status TEXT NOT NULL DEFAULT '1' CHECK (budget_status IN ('1', '2')),

  -- Period
  period_start DATE,
  period_end DATE,

  -- Value
  value NUMERIC(20, 2),
  currency TEXT DEFAULT 'USD',
  value_date DATE,

  -- Recipient info (for non-total budgets)
  recipient_ref TEXT,
  recipient_narrative TEXT,
  recipient_vocabulary TEXT,
  recipient_vocabulary_uri TEXT,

  -- Budget lines stored as JSONB
  budget_lines JSONB DEFAULT '[]'::jsonb,

  -- Sort order
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_organization_budgets_org_id ON organization_budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_budgets_type ON organization_budgets(budget_type);

-- Enable RLS
ALTER TABLE organization_budgets ENABLE ROW LEVEL SECURITY;

-- RLS policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view organization budgets" ON organization_budgets;
DROP POLICY IF EXISTS "Authenticated users can insert organization budgets" ON organization_budgets;
DROP POLICY IF EXISTS "Authenticated users can update organization budgets" ON organization_budgets;
DROP POLICY IF EXISTS "Authenticated users can delete organization budgets" ON organization_budgets;

CREATE POLICY "Anyone can view organization budgets"
  ON organization_budgets FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert organization budgets"
  ON organization_budgets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update organization budgets"
  ON organization_budgets FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete organization budgets"
  ON organization_budgets FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_organization_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organization_budgets_updated_at ON organization_budgets;
CREATE TRIGGER update_organization_budgets_updated_at
  BEFORE UPDATE ON organization_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_budgets_updated_at();
