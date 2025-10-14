-- Migration: Add Document Links for Results, Indicators, Baselines, and Periods
-- Description: Create tables to store document attachments at all levels of the results framework

-- Drop existing tables if they exist (to ensure clean migration)
DROP TABLE IF EXISTS period_document_links CASCADE;
DROP TABLE IF EXISTS baseline_document_links CASCADE;
DROP TABLE IF EXISTS indicator_document_links CASCADE;
DROP TABLE IF EXISTS result_document_links CASCADE;

-- Document links for results
CREATE TABLE result_document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID NOT NULL REFERENCES activity_results(id) ON DELETE CASCADE,
    format TEXT,
    url TEXT NOT NULL,
    title JSONB NOT NULL DEFAULT '{"en": ""}',
    description JSONB DEFAULT '{"en": ""}',
    category_code TEXT,
    language_code TEXT,
    document_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Document links for indicators
CREATE TABLE indicator_document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_id UUID NOT NULL REFERENCES result_indicators(id) ON DELETE CASCADE,
    format TEXT,
    url TEXT NOT NULL,
    title JSONB NOT NULL DEFAULT '{"en": ""}',
    description JSONB DEFAULT '{"en": ""}',
    category_code TEXT,
    language_code TEXT,
    document_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Document links for baselines
CREATE TABLE baseline_document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baseline_id UUID NOT NULL REFERENCES indicator_baselines(id) ON DELETE CASCADE,
    format TEXT,
    url TEXT NOT NULL,
    title JSONB NOT NULL DEFAULT '{"en": ""}',
    description JSONB DEFAULT '{"en": ""}',
    category_code TEXT,
    language_code TEXT,
    document_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Document links for periods (separate for target and actual)
CREATE TABLE period_document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES indicator_periods(id) ON DELETE CASCADE,
    link_type TEXT NOT NULL CHECK (link_type IN ('target', 'actual')),
    format TEXT,
    url TEXT NOT NULL,
    title JSONB NOT NULL DEFAULT '{"en": ""}',
    description JSONB DEFAULT '{"en": ""}',
    category_code TEXT,
    language_code TEXT,
    document_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_result_docs_result ON result_document_links(result_id);
CREATE INDEX IF NOT EXISTS idx_indicator_docs_indicator ON indicator_document_links(indicator_id);
CREATE INDEX IF NOT EXISTS idx_baseline_docs_baseline ON baseline_document_links(baseline_id);
CREATE INDEX IF NOT EXISTS idx_period_docs_period ON period_document_links(period_id);
CREATE INDEX IF NOT EXISTS idx_period_docs_type ON period_document_links(link_type);

-- Add RLS policies
ALTER TABLE result_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE baseline_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_document_links ENABLE ROW LEVEL SECURITY;

-- Result document links policies
CREATE POLICY "Users can view result document links for activities they can view"
    ON result_document_links FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM activity_results ar
            JOIN activities a ON ar.activity_id = a.id
            WHERE ar.id = result_document_links.result_id
        )
    );

CREATE POLICY "Users can insert result document links for activities they can edit"
    ON result_document_links FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM activity_results ar
            JOIN activities a ON ar.activity_id = a.id
            WHERE ar.id = result_document_links.result_id
        )
    );

CREATE POLICY "Users can update their own result document links"
    ON result_document_links FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own result document links"
    ON result_document_links FOR DELETE
    USING (created_by = auth.uid());

-- Indicator document links policies
CREATE POLICY "Users can view indicator document links"
    ON indicator_document_links FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM result_indicators ri
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ri.id = indicator_document_links.indicator_id
        )
    );

CREATE POLICY "Users can insert indicator document links"
    ON indicator_document_links FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM result_indicators ri
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ri.id = indicator_document_links.indicator_id
        )
    );

CREATE POLICY "Users can update their own indicator document links"
    ON indicator_document_links FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own indicator document links"
    ON indicator_document_links FOR DELETE
    USING (created_by = auth.uid());

-- Baseline document links policies
CREATE POLICY "Users can view baseline document links"
    ON baseline_document_links FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM indicator_baselines ib
            JOIN result_indicators ri ON ib.indicator_id = ri.id
            WHERE ib.id = baseline_document_links.baseline_id
        )
    );

CREATE POLICY "Users can insert baseline document links"
    ON baseline_document_links FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM indicator_baselines ib
            JOIN result_indicators ri ON ib.indicator_id = ri.id
            WHERE ib.id = baseline_document_links.baseline_id
        )
    );

CREATE POLICY "Users can update their own baseline document links"
    ON baseline_document_links FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own baseline document links"
    ON baseline_document_links FOR DELETE
    USING (created_by = auth.uid());

-- Period document links policies
CREATE POLICY "Users can view period document links"
    ON period_document_links FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM indicator_periods ip
            JOIN result_indicators ri ON ip.indicator_id = ri.id
            WHERE ip.id = period_document_links.period_id
        )
    );

CREATE POLICY "Users can insert period document links"
    ON period_document_links FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM indicator_periods ip
            JOIN result_indicators ri ON ip.indicator_id = ri.id
            WHERE ip.id = period_document_links.period_id
        )
    );

CREATE POLICY "Users can update their own period document links"
    ON period_document_links FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own period document links"
    ON period_document_links FOR DELETE
    USING (created_by = auth.uid());

