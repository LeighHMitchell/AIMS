-- Create humanitarian_scope and humanitarian_scope_narratives tables
-- IATI Standard: humanitarian-scope identifies specific emergency or appeal that activity responds to
-- Reference: https://iatistandard.org/en/guidance/standard-guidance/humanitarian/

-- Create humanitarian_scope table
CREATE TABLE IF NOT EXISTS humanitarian_scope (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    type VARCHAR(2) NOT NULL CHECK (type IN ('1', '2')),
    vocabulary VARCHAR(10) NOT NULL,
    code VARCHAR(100) NOT NULL,
    vocabulary_uri TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE humanitarian_scope IS 'IATI humanitarian-scope: identifies specific emergency or appeal';
COMMENT ON COLUMN humanitarian_scope.type IS 'Type: 1=Emergency, 2=Appeal';
COMMENT ON COLUMN humanitarian_scope.vocabulary IS 'Vocabulary: 1-2=GLIDE, 2-1=Humanitarian Response Plan, 99=Custom';
COMMENT ON COLUMN humanitarian_scope.code IS 'Code from specified vocabulary (e.g., GLIDE number, HRP plan code)';
COMMENT ON COLUMN humanitarian_scope.vocabulary_uri IS 'URI for custom vocabulary (when vocabulary=99)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_humanitarian_scope_activity_id ON humanitarian_scope(activity_id);

-- Create humanitarian_scope_narratives table for multilingual support
CREATE TABLE IF NOT EXISTS humanitarian_scope_narratives (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    humanitarian_scope_id UUID NOT NULL REFERENCES humanitarian_scope(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'en',
    narrative TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE humanitarian_scope_narratives IS 'Multilingual narratives for humanitarian scope entries';
COMMENT ON COLUMN humanitarian_scope_narratives.language IS 'ISO 639-1 language code (e.g., en, fr, es)';
COMMENT ON COLUMN humanitarian_scope_narratives.narrative IS 'Human-readable description of the emergency or appeal';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_humanitarian_scope_narratives_scope_id ON humanitarian_scope_narratives(humanitarian_scope_id);

