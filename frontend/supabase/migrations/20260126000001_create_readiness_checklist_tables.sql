-- Government Readiness Checklist Tables
-- This migration creates tables for tracking government preparatory milestones before project validation

-- Table 1: Readiness Checklist Templates (Stages)
-- Defines stages like Pre-Proposal, Pre-Appraisal, Pre-Negotiation, etc.
CREATE TABLE IF NOT EXISTS readiness_checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    stage_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_readiness_templates_order ON readiness_checklist_templates(stage_order);

-- Table 2: Readiness Checklist Items
-- Individual checklist items within each stage
CREATE TABLE IF NOT EXISTS readiness_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES readiness_checklist_templates(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    guidance_text TEXT,
    responsible_agency_type TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    -- JSONB for conditional display rules
    -- Example: {"financing_type": ["loan"], "modality": ["results_based"], "is_infrastructure": true}
    applicable_conditions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(template_id, code)
);

-- Create indexes for checklist items
CREATE INDEX IF NOT EXISTS idx_readiness_items_template ON readiness_checklist_items(template_id);
CREATE INDEX IF NOT EXISTS idx_readiness_items_order ON readiness_checklist_items(template_id, display_order);
CREATE INDEX IF NOT EXISTS idx_readiness_items_conditions ON readiness_checklist_items USING GIN (applicable_conditions);

-- Table 3: Activity Readiness Configuration
-- Per-activity settings for financing type and modality (used to filter applicable checklist items)
CREATE TABLE IF NOT EXISTS activity_readiness_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    financing_type TEXT CHECK (financing_type IN ('loan', 'grant', 'technical_assistance', 'mixed', 'other')),
    financing_modality TEXT CHECK (financing_modality IN ('standard', 'results_based', 'budgetary_support', 'project_preparation')),
    is_infrastructure BOOLEAN DEFAULT FALSE,
    additional_flags JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(activity_id)
);

-- Create index for activity lookup
CREATE INDEX IF NOT EXISTS idx_readiness_config_activity ON activity_readiness_config(activity_id);

-- Table 4: Activity Readiness Responses
-- User responses for each checklist item per activity
CREATE TABLE IF NOT EXISTS activity_readiness_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    checklist_item_id UUID NOT NULL REFERENCES readiness_checklist_items(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_completed' CHECK (status IN ('completed', 'not_completed', 'not_required', 'in_progress')),
    remarks TEXT,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(activity_id, checklist_item_id)
);

-- Create indexes for responses
CREATE INDEX IF NOT EXISTS idx_readiness_responses_activity ON activity_readiness_responses(activity_id);
CREATE INDEX IF NOT EXISTS idx_readiness_responses_item ON activity_readiness_responses(checklist_item_id);
CREATE INDEX IF NOT EXISTS idx_readiness_responses_status ON activity_readiness_responses(status);

-- Table 5: Readiness Evidence Documents
-- Separate storage for evidence files attached to checklist items
CREATE TABLE IF NOT EXISTS readiness_evidence_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES activity_readiness_responses(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    storage_path TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for document lookup
CREATE INDEX IF NOT EXISTS idx_readiness_documents_response ON readiness_evidence_documents(response_id);

-- Table 6: Readiness Stage Sign-offs
-- Formal stage certifications by government officials
CREATE TABLE IF NOT EXISTS readiness_stage_signoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES readiness_checklist_templates(id) ON DELETE CASCADE,
    signed_off_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    signed_off_at TIMESTAMPTZ DEFAULT NOW(),
    signature_title TEXT,
    items_completed INTEGER NOT NULL DEFAULT 0,
    items_not_required INTEGER NOT NULL DEFAULT 0,
    items_total INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(activity_id, template_id)
);

-- Create indexes for sign-offs
CREATE INDEX IF NOT EXISTS idx_readiness_signoffs_activity ON readiness_stage_signoffs(activity_id);
CREATE INDEX IF NOT EXISTS idx_readiness_signoffs_template ON readiness_stage_signoffs(template_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_readiness_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
DROP TRIGGER IF EXISTS update_readiness_templates_updated_at ON readiness_checklist_templates;
CREATE TRIGGER update_readiness_templates_updated_at
    BEFORE UPDATE ON readiness_checklist_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_readiness_updated_at();

DROP TRIGGER IF EXISTS update_readiness_items_updated_at ON readiness_checklist_items;
CREATE TRIGGER update_readiness_items_updated_at
    BEFORE UPDATE ON readiness_checklist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_readiness_updated_at();

DROP TRIGGER IF EXISTS update_readiness_config_updated_at ON activity_readiness_config;
CREATE TRIGGER update_readiness_config_updated_at
    BEFORE UPDATE ON activity_readiness_config
    FOR EACH ROW
    EXECUTE FUNCTION update_readiness_updated_at();

DROP TRIGGER IF EXISTS update_readiness_responses_updated_at ON activity_readiness_responses;
CREATE TRIGGER update_readiness_responses_updated_at
    BEFORE UPDATE ON activity_readiness_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_readiness_updated_at();

-- Enable Row Level Security
ALTER TABLE readiness_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_readiness_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_readiness_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_evidence_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_stage_signoffs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Templates (read by all authenticated, write by admin only)
CREATE POLICY "Templates are viewable by authenticated users"
    ON readiness_checklist_templates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Templates are editable by admins"
    ON readiness_checklist_templates FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for Items (read by all authenticated, write by admin only)
CREATE POLICY "Items are viewable by authenticated users"
    ON readiness_checklist_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Items are editable by admins"
    ON readiness_checklist_items FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for Config (tied to activity access)
CREATE POLICY "Config is viewable by users who can view the activity"
    ON activity_readiness_config FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM activities
            WHERE activities.id = activity_readiness_config.activity_id
        )
    );

CREATE POLICY "Config is editable by authenticated users"
    ON activity_readiness_config FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Config is updatable by authenticated users"
    ON activity_readiness_config FOR UPDATE
    TO authenticated
    USING (true);

-- RLS Policies for Responses
CREATE POLICY "Responses are viewable by users who can view the activity"
    ON activity_readiness_responses FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM activities
            WHERE activities.id = activity_readiness_responses.activity_id
        )
    );

CREATE POLICY "Responses are insertable by authenticated users"
    ON activity_readiness_responses FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Responses are updatable by authenticated users"
    ON activity_readiness_responses FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Responses are deletable by authenticated users"
    ON activity_readiness_responses FOR DELETE
    TO authenticated
    USING (true);

-- RLS Policies for Evidence Documents
CREATE POLICY "Evidence documents are viewable by users who can view the response"
    ON readiness_evidence_documents FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM activity_readiness_responses r
            JOIN activities a ON a.id = r.activity_id
            WHERE r.id = readiness_evidence_documents.response_id
        )
    );

CREATE POLICY "Evidence documents are insertable by authenticated users"
    ON readiness_evidence_documents FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Evidence documents are deletable by authenticated users"
    ON readiness_evidence_documents FOR DELETE
    TO authenticated
    USING (true);

-- RLS Policies for Sign-offs
CREATE POLICY "Sign-offs are viewable by users who can view the activity"
    ON readiness_stage_signoffs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM activities
            WHERE activities.id = readiness_stage_signoffs.activity_id
        )
    );

CREATE POLICY "Sign-offs are insertable by authenticated users"
    ON readiness_stage_signoffs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE readiness_checklist_templates IS 'Defines stages/phases for the government readiness checklist (e.g., Pre-Proposal, Pre-Appraisal)';
COMMENT ON TABLE readiness_checklist_items IS 'Individual checklist items within each stage, with conditional display rules';
COMMENT ON TABLE activity_readiness_config IS 'Per-activity configuration for financing type and modality, used to filter applicable items';
COMMENT ON TABLE activity_readiness_responses IS 'User responses tracking completion status for each checklist item per activity';
COMMENT ON TABLE readiness_evidence_documents IS 'Evidence documents uploaded as proof for checklist item completion';
COMMENT ON TABLE readiness_stage_signoffs IS 'Formal sign-off records when a government official certifies a stage is complete';

COMMENT ON COLUMN readiness_checklist_items.applicable_conditions IS 'JSONB conditions for when this item applies. Keys: financing_type (array), modality (array), is_infrastructure (boolean)';
COMMENT ON COLUMN activity_readiness_responses.status IS 'One of: completed, not_completed, not_required, in_progress';
