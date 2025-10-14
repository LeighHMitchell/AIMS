-- Enhance Results tables for full IATI Standard v2.03 compliance
-- Adds support for references, document-links, dimensions, and additional IATI fields

-- ============================================================================
-- 1. RESULT REFERENCES TABLE
-- ============================================================================
-- Stores result-level reference vocabularies (e.g., SDG indicators)
CREATE TABLE IF NOT EXISTS result_references (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    result_id UUID NOT NULL REFERENCES activity_results(id) ON DELETE CASCADE,
    
    -- Reference attributes
    vocabulary TEXT NOT NULL,
    code TEXT NOT NULL,
    vocabulary_uri TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT result_references_result_id_fkey FOREIGN KEY (result_id) REFERENCES activity_results(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_result_references_result_id ON result_references(result_id);

-- ============================================================================
-- 2. RESULT DOCUMENT LINKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS result_document_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    result_id UUID NOT NULL REFERENCES activity_results(id) ON DELETE CASCADE,
    
    -- Document attributes
    format TEXT,
    url TEXT NOT NULL,
    title JSONB DEFAULT '{"en": ""}',
    description JSONB DEFAULT '{"en": ""}',
    category_code TEXT,
    language_code TEXT DEFAULT 'en',
    document_date DATE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT result_document_links_result_id_fkey FOREIGN KEY (result_id) REFERENCES activity_results(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_result_document_links_result_id ON result_document_links(result_id);

-- ============================================================================
-- 3. INDICATOR DOCUMENT LINKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS indicator_document_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    indicator_id UUID NOT NULL REFERENCES result_indicators(id) ON DELETE CASCADE,
    
    -- Document attributes
    format TEXT,
    url TEXT NOT NULL,
    title JSONB DEFAULT '{"en": ""}',
    description JSONB DEFAULT '{"en": ""}',
    category_code TEXT,
    language_code TEXT DEFAULT 'en',
    document_date DATE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT indicator_document_links_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES result_indicators(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_indicator_document_links_indicator_id ON indicator_document_links(indicator_id);

-- ============================================================================
-- 4. BASELINE DOCUMENT LINKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS baseline_document_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    baseline_id UUID NOT NULL REFERENCES indicator_baselines(id) ON DELETE CASCADE,
    
    -- Document attributes
    format TEXT,
    url TEXT NOT NULL,
    title JSONB DEFAULT '{"en": ""}',
    description JSONB DEFAULT '{"en": ""}',
    category_code TEXT,
    language_code TEXT DEFAULT 'en',
    document_date DATE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT baseline_document_links_baseline_id_fkey FOREIGN KEY (baseline_id) REFERENCES indicator_baselines(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_baseline_document_links_baseline_id ON baseline_document_links(baseline_id);

-- ============================================================================
-- 5. PERIOD DOCUMENT LINKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS period_document_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    period_id UUID NOT NULL REFERENCES indicator_periods(id) ON DELETE CASCADE,
    
    -- Document attributes
    format TEXT,
    url TEXT NOT NULL,
    title JSONB DEFAULT '{"en": ""}',
    description JSONB DEFAULT '{"en": ""}',
    category_code TEXT,
    language_code TEXT DEFAULT 'en',
    document_date DATE,
    
    -- Link type (target or actual)
    link_type TEXT CHECK (link_type IN ('target', 'actual', 'general')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT period_document_links_period_id_fkey FOREIGN KEY (period_id) REFERENCES indicator_periods(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_period_document_links_period_id ON period_document_links(period_id);

-- ============================================================================
-- 6. DIMENSIONS TABLE (for disaggregation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS result_dimensions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Parent reference (can be baseline or period)
    baseline_id UUID REFERENCES indicator_baselines(id) ON DELETE CASCADE,
    period_id UUID REFERENCES indicator_periods(id) ON DELETE CASCADE,
    
    -- Dimension data
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    
    -- Type (target or actual, only relevant for periods)
    dimension_type TEXT CHECK (dimension_type IN ('baseline', 'target', 'actual')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure dimension belongs to either baseline or period, not both
    CONSTRAINT result_dimensions_parent_check CHECK (
        (baseline_id IS NOT NULL AND period_id IS NULL AND dimension_type = 'baseline') OR
        (baseline_id IS NULL AND period_id IS NOT NULL AND dimension_type IN ('target', 'actual'))
    )
);

CREATE INDEX IF NOT EXISTS idx_result_dimensions_baseline_id ON result_dimensions(baseline_id);
CREATE INDEX IF NOT EXISTS idx_result_dimensions_period_id ON result_dimensions(period_id);

-- ============================================================================
-- 7. BASELINE LOCATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS baseline_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    baseline_id UUID NOT NULL REFERENCES indicator_baselines(id) ON DELETE CASCADE,
    location_ref TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT baseline_locations_baseline_id_fkey FOREIGN KEY (baseline_id) REFERENCES indicator_baselines(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_baseline_locations_baseline_id ON baseline_locations(baseline_id);

-- ============================================================================
-- 8. PERIOD LOCATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS period_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    period_id UUID NOT NULL REFERENCES indicator_periods(id) ON DELETE CASCADE,
    location_ref TEXT NOT NULL,
    location_type TEXT CHECK (location_type IN ('target', 'actual')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT period_locations_period_id_fkey FOREIGN KEY (period_id) REFERENCES indicator_periods(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_period_locations_period_id ON period_locations(period_id);

-- ============================================================================
-- 9. ENHANCE EXISTING TABLES
-- ============================================================================

-- Remove old location_ref columns (now in separate tables)
ALTER TABLE indicator_baselines DROP COLUMN IF EXISTS location_ref;
ALTER TABLE indicator_periods DROP COLUMN IF EXISTS target_location_ref;
ALTER TABLE indicator_periods DROP COLUMN IF EXISTS actual_location_ref;

-- Add JSONB comment fields for multilingual support where needed
ALTER TABLE indicator_baselines 
    DROP COLUMN IF EXISTS comment,
    ADD COLUMN IF NOT EXISTS comment JSONB DEFAULT '{"en": ""}';

ALTER TABLE indicator_periods
    DROP COLUMN IF EXISTS target_comment,
    ADD COLUMN IF NOT EXISTS target_comment JSONB DEFAULT '{"en": ""}',
    DROP COLUMN IF EXISTS actual_comment,
    ADD COLUMN IF NOT EXISTS actual_comment JSONB DEFAULT '{"en": ""}';

-- ============================================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE result_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE baseline_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE baseline_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can view, authenticated users can manage
CREATE POLICY "Result references are viewable by everyone"
    ON result_references FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage result references"
    ON result_references FOR ALL
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Result document links are viewable by everyone"
    ON result_document_links FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage result document links"
    ON result_document_links FOR ALL
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Indicator document links are viewable by everyone"
    ON indicator_document_links FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage indicator document links"
    ON indicator_document_links FOR ALL
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Baseline document links are viewable by everyone"
    ON baseline_document_links FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage baseline document links"
    ON baseline_document_links FOR ALL
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Period document links are viewable by everyone"
    ON period_document_links FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage period document links"
    ON period_document_links FOR ALL
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Dimensions are viewable by everyone"
    ON result_dimensions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage dimensions"
    ON result_dimensions FOR ALL
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Baseline locations are viewable by everyone"
    ON baseline_locations FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage baseline locations"
    ON baseline_locations FOR ALL
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Period locations are viewable by everyone"
    ON period_locations FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage period locations"
    ON period_locations FOR ALL
    USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 11. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_result_document_links_updated_at 
    BEFORE UPDATE ON result_document_links 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_indicator_document_links_updated_at 
    BEFORE UPDATE ON indicator_document_links 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_baseline_document_links_updated_at 
    BEFORE UPDATE ON baseline_document_links 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_period_document_links_updated_at 
    BEFORE UPDATE ON period_document_links 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

