-- Add IATI compliance fields to organizations table
-- Migration: Add IATI organization support
-- Date: 2025-01-22

-- Add mandatory IATI fields to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS reporting_org_ref TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS reporting_org_type TEXT; 
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS reporting_org_name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS reporting_org_secondary_reporter BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_updated_datetime TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'USD';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en';

-- Comments for IATI fields
COMMENT ON COLUMN organizations.reporting_org_ref IS 'IATI reporting organization reference identifier';
COMMENT ON COLUMN organizations.reporting_org_type IS 'IATI organization type code for reporting org';
COMMENT ON COLUMN organizations.reporting_org_name IS 'Name of the reporting organization';
COMMENT ON COLUMN organizations.reporting_org_secondary_reporter IS 'Whether this is a secondary reporter';
COMMENT ON COLUMN organizations.last_updated_datetime IS 'IATI last-updated-datetime attribute';
COMMENT ON COLUMN organizations.default_currency IS 'IATI default currency code';
COMMENT ON COLUMN organizations.default_language IS 'IATI default language code';

-- Multi-language name support
CREATE TABLE IF NOT EXISTS organization_names (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    language_code TEXT DEFAULT 'en',
    narrative TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique language per organization
    UNIQUE(organization_id, language_code)
);

-- Organization budgets (total, recipient-org, recipient-country, recipient-region)
CREATE TABLE IF NOT EXISTS organization_budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    budget_type TEXT NOT NULL CHECK (budget_type IN ('total', 'recipient-org', 'recipient-country', 'recipient-region')),
    budget_status TEXT DEFAULT '1' CHECK (budget_status IN ('1', '2')), -- '1'=indicative, '2'=committed
    period_start DATE,
    period_end DATE,
    value DECIMAL(15,2),
    currency TEXT DEFAULT 'USD',
    value_date DATE,
    -- For recipient budgets
    recipient_ref TEXT, -- Organization ref, country code, or region code
    recipient_narrative TEXT,
    recipient_vocabulary TEXT, -- For regions: vocabulary used
    recipient_vocabulary_uri TEXT, -- For custom vocabularies
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget lines (sub-components of budgets)
CREATE TABLE IF NOT EXISTS organization_budget_lines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    budget_id UUID REFERENCES organization_budgets(id) ON DELETE CASCADE,
    ref TEXT, -- Budget line reference
    value DECIMAL(15,2),
    currency TEXT DEFAULT 'USD',
    value_date DATE,
    narrative TEXT,
    language_code TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization expenditures  
CREATE TABLE IF NOT EXISTS organization_expenditures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    period_start DATE,
    period_end DATE,
    value DECIMAL(15,2),
    currency TEXT DEFAULT 'USD',
    value_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenditure lines (sub-components of expenditures)
CREATE TABLE IF NOT EXISTS organization_expense_lines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    expenditure_id UUID REFERENCES organization_expenditures(id) ON DELETE CASCADE,
    ref TEXT, -- Expense line reference
    value DECIMAL(15,2),
    currency TEXT DEFAULT 'USD',
    value_date DATE,
    narrative TEXT,
    language_code TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document links with full IATI support
CREATE TABLE IF NOT EXISTS organization_document_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    format TEXT, -- MIME type or file format
    document_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document link titles (multi-language)
CREATE TABLE IF NOT EXISTS organization_document_titles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_link_id UUID REFERENCES organization_document_links(id) ON DELETE CASCADE,
    narrative TEXT NOT NULL,
    language_code TEXT DEFAULT 'en',
    
    -- Ensure unique language per document
    UNIQUE(document_link_id, language_code)
);

-- Document link descriptions (multi-language)
CREATE TABLE IF NOT EXISTS organization_document_descriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_link_id UUID REFERENCES organization_document_links(id) ON DELETE CASCADE,
    narrative TEXT NOT NULL,
    language_code TEXT DEFAULT 'en',
    
    -- Ensure unique language per document  
    UNIQUE(document_link_id, language_code)
);

-- Document categories (multiple per document)
CREATE TABLE IF NOT EXISTS organization_document_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_link_id UUID REFERENCES organization_document_links(id) ON DELETE CASCADE,
    category_code TEXT NOT NULL, -- B01, B02, etc.
    
    -- Ensure unique category per document
    UNIQUE(document_link_id, category_code)
);

-- Document languages (multiple per document)
CREATE TABLE IF NOT EXISTS organization_document_languages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_link_id UUID REFERENCES organization_document_links(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL, -- en, fr, etc.
    
    -- Ensure unique language per document
    UNIQUE(document_link_id, language_code)
);

-- Document recipient countries (multiple per document)
CREATE TABLE IF NOT EXISTS organization_document_recipient_countries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_link_id UUID REFERENCES organization_document_links(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL, -- AF, AX, AL, etc.
    narrative TEXT,
    language_code TEXT DEFAULT 'en',
    
    -- Ensure unique country per document
    UNIQUE(document_link_id, country_code)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_names_org_id ON organization_names(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_budgets_org_id ON organization_budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_budgets_type ON organization_budgets(budget_type);
CREATE INDEX IF NOT EXISTS idx_organization_expenditures_org_id ON organization_expenditures(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_document_links_org_id ON organization_document_links(organization_id);

-- Enable RLS on new tables
ALTER TABLE organization_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_expenditures ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_expense_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_document_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_document_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_document_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_document_recipient_countries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization-related tables
CREATE POLICY "Users can view organization IATI data they have access to" ON organization_names
    FOR SELECT USING (true); -- Allow all users to read for now

CREATE POLICY "Users can view organization budgets" ON organization_budgets
    FOR SELECT USING (true);

CREATE POLICY "Users can view organization expenditures" ON organization_expenditures
    FOR SELECT USING (true);

CREATE POLICY "Users can view organization document links" ON organization_document_links
    FOR SELECT USING (true);

-- Add update triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organization_budgets_updated_at 
    BEFORE UPDATE ON organization_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_expenditures_updated_at 
    BEFORE UPDATE ON organization_expenditures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_document_links_updated_at 
    BEFORE UPDATE ON organization_document_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
