-- Complete Results Migration for IATI XML Import
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. RESULT REFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS result_references (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    result_id UUID NOT NULL REFERENCES activity_results(id) ON DELETE CASCADE,
    
    -- Reference attributes
    vocabulary TEXT NOT NULL,
    code TEXT NOT NULL,
    vocabulary_uri TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_result_document_links_result_id ON result_document_links(result_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE result_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_document_links ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- 4. UPDATE TRIGGERS
-- ============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for result_document_links
CREATE TRIGGER update_result_document_links_updated_at 
    BEFORE UPDATE ON result_document_links 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test that tables were created successfully
SELECT 'result_references table created' as status WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'result_references' 
    AND table_schema = 'public'
);

SELECT 'result_document_links table created' as status WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'result_document_links' 
    AND table_schema = 'public'
);

SELECT 'Migration completed successfully!' as result;
