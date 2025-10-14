-- Migration: Add References for Results and Indicators
-- Description: Create tables to store external reference vocabularies for results framework elements

-- Drop existing tables if they exist (to ensure clean migration)
DROP TABLE IF EXISTS indicator_references CASCADE;
DROP TABLE IF EXISTS result_references CASCADE;

-- References for results
CREATE TABLE result_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID NOT NULL REFERENCES activity_results(id) ON DELETE CASCADE,
    vocabulary TEXT NOT NULL,
    code TEXT NOT NULL,
    vocabulary_uri TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- References for indicators
CREATE TABLE indicator_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_id UUID NOT NULL REFERENCES result_indicators(id) ON DELETE CASCADE,
    vocabulary TEXT NOT NULL,
    code TEXT NOT NULL,
    vocabulary_uri TEXT,
    indicator_uri TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_result_refs_result ON result_references(result_id);
CREATE INDEX IF NOT EXISTS idx_result_refs_vocab ON result_references(vocabulary);
CREATE INDEX IF NOT EXISTS idx_indicator_refs_indicator ON indicator_references(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_refs_vocab ON indicator_references(vocabulary);

-- Add RLS policies
ALTER TABLE result_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_references ENABLE ROW LEVEL SECURITY;

-- Result references policies
CREATE POLICY "Users can view result references for activities they can view"
    ON result_references FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM activity_results ar
            JOIN activities a ON ar.activity_id = a.id
            WHERE ar.id = result_references.result_id
        )
    );

CREATE POLICY "Users can insert result references for activities they can edit"
    ON result_references FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM activity_results ar
            JOIN activities a ON ar.activity_id = a.id
            WHERE ar.id = result_references.result_id
        )
    );

CREATE POLICY "Users can update result references"
    ON result_references FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM activity_results ar
            JOIN activities a ON ar.activity_id = a.id
            WHERE ar.id = result_references.result_id
        )
    );

CREATE POLICY "Users can delete their own result references"
    ON result_references FOR DELETE
    USING (created_by = auth.uid());

-- Indicator references policies
CREATE POLICY "Users can view indicator references"
    ON indicator_references FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM result_indicators ri
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ri.id = indicator_references.indicator_id
        )
    );

CREATE POLICY "Users can insert indicator references"
    ON indicator_references FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM result_indicators ri
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ri.id = indicator_references.indicator_id
        )
    );

CREATE POLICY "Users can update indicator references"
    ON indicator_references FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM result_indicators ri
            JOIN activity_results ar ON ri.result_id = ar.id
            WHERE ri.id = indicator_references.indicator_id
        )
    );

CREATE POLICY "Users can delete their own indicator references"
    ON indicator_references FOR DELETE
    USING (created_by = auth.uid());

