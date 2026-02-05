-- Create iati_import_batches table for tracking bulk import operations
CREATE TABLE IF NOT EXISTS iati_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    file_name VARCHAR(255),
    file_hash VARCHAR(64),
    iati_version VARCHAR(10),
    reporting_org_ref VARCHAR(255),
    reporting_org_name VARCHAR(255),
    total_activities INTEGER DEFAULT 0,
    created_count INTEGER DEFAULT 0,
    updated_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'validated', 'importing', 'completed', 'failed', 'cancelled')),
    import_rules JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create iati_import_batch_items table for per-activity tracking
CREATE TABLE IF NOT EXISTS iati_import_batch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES iati_import_batches(id) ON DELETE CASCADE,
    iati_identifier VARCHAR(255),
    activity_title VARCHAR(500),
    activity_id UUID,
    action VARCHAR(20) DEFAULT 'pending' CHECK (action IN ('create', 'update', 'skip', 'fail', 'pending')),
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'skipped')),
    transactions_count INTEGER DEFAULT 0,
    transactions_imported INTEGER DEFAULT 0,
    error_message TEXT,
    validation_issues JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_iati_import_batches_user_id ON iati_import_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_iati_import_batches_status ON iati_import_batches(status);
CREATE INDEX IF NOT EXISTS idx_iati_import_batches_file_hash ON iati_import_batches(file_hash);
CREATE INDEX IF NOT EXISTS idx_iati_import_batches_created_at ON iati_import_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iati_import_batch_items_batch_id ON iati_import_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_iati_import_batch_items_status ON iati_import_batch_items(status);
CREATE INDEX IF NOT EXISTS idx_iati_import_batch_items_iati_identifier ON iati_import_batch_items(iati_identifier);

-- Enable RLS
ALTER TABLE iati_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE iati_import_batch_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for iati_import_batches
-- Users can view their own batches
CREATE POLICY "Users can view own batches" ON iati_import_batches
    FOR SELECT USING (user_id = auth.uid());

-- Super users can view all batches
CREATE POLICY "Super users can view all batches" ON iati_import_batches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_user'
        )
    );

-- Users can create their own batches
CREATE POLICY "Users can create own batches" ON iati_import_batches
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own batches
CREATE POLICY "Users can update own batches" ON iati_import_batches
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for iati_import_batch_items
-- Users can view items from their own batches
CREATE POLICY "Users can view own batch items" ON iati_import_batch_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM iati_import_batches
            WHERE iati_import_batches.id = iati_import_batch_items.batch_id
            AND iati_import_batches.user_id = auth.uid()
        )
    );

-- Super users can view all batch items
CREATE POLICY "Super users can view all batch items" ON iati_import_batch_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_user'
        )
    );

-- Users can insert items into their own batches
CREATE POLICY "Users can insert own batch items" ON iati_import_batch_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM iati_import_batches
            WHERE iati_import_batches.id = iati_import_batch_items.batch_id
            AND iati_import_batches.user_id = auth.uid()
        )
    );

-- Users can update items in their own batches
CREATE POLICY "Users can update own batch items" ON iati_import_batch_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM iati_import_batches
            WHERE iati_import_batches.id = iati_import_batch_items.batch_id
            AND iati_import_batches.user_id = auth.uid()
        )
    );

-- Create updated_at triggers
CREATE TRIGGER update_iati_import_batches_updated_at
    BEFORE UPDATE ON iati_import_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_iati_import_batch_items_updated_at
    BEFORE UPDATE ON iati_import_batch_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
