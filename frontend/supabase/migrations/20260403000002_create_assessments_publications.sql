-- ============================================================
-- Migration: Create assessments table for tracking assessments,
-- surveys, and publications across organizations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,

    -- Classification
    document_type TEXT NOT NULL CHECK (document_type IN ('assessment', 'survey', 'evaluation', 'research', 'report', 'policy_brief', 'case_study', 'lessons_learned', 'guidance', 'other')),
    sector_codes TEXT[],
    sector_names TEXT[],

    -- Source
    lead_organization_id UUID REFERENCES public.organizations(id),
    contributing_organization_ids UUID[],
    author_names TEXT[],

    -- Geographic scope
    geographic_scope TEXT CHECK (geographic_scope IN ('national', 'regional', 'township', 'village')),
    region_names TEXT[],
    pcodes TEXT[],

    -- Dates
    publication_date DATE,
    data_collection_start DATE,
    data_collection_end DATE,

    -- Access
    url TEXT,
    file_path TEXT,
    file_name TEXT,
    file_size INTEGER,
    format TEXT,
    language TEXT DEFAULT 'en',
    is_public BOOLEAN DEFAULT TRUE,

    -- Methodology (for assessments/surveys)
    methodology TEXT,
    sample_size INTEGER,

    -- Linked activities
    activity_ids UUID[],

    -- Tags
    tags TEXT[],

    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assessments_document_type ON public.assessments (document_type);
CREATE INDEX IF NOT EXISTS idx_assessments_lead_organization_id ON public.assessments (lead_organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_sector_codes ON public.assessments USING GIN (sector_codes);
CREATE INDEX IF NOT EXISTS idx_assessments_region_names ON public.assessments USING GIN (region_names);
CREATE INDEX IF NOT EXISTS idx_assessments_publication_date ON public.assessments (publication_date);
CREATE INDEX IF NOT EXISTS idx_assessments_tags ON public.assessments USING GIN (tags);

-- RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Readable by all authenticated users
CREATE POLICY "Authenticated users can view assessments"
    ON public.assessments FOR SELECT
    TO authenticated
    USING (true);

-- Writable by super_user/admin or the creator
CREATE POLICY "Admins and creators can insert assessments"
    ON public.assessments FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_user', 'admin')
        )
    );

CREATE POLICY "Admins and creators can update assessments"
    ON public.assessments FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_user', 'admin')
        )
    );

CREATE POLICY "Admins and creators can delete assessments"
    ON public.assessments FOR DELETE
    TO authenticated
    USING (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_user', 'admin')
        )
    );

-- Updated_at trigger
CREATE TRIGGER update_assessments_updated_at
    BEFORE UPDATE ON public.assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
