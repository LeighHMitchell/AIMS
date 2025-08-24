-- Create transaction_sector_lines table for transaction-level sector allocation
-- This enables users to specify sector percentages for individual transactions
-- following IATI v2.03+ standards for granular sector reporting

-- Create the transaction_sector_lines table
CREATE TABLE IF NOT EXISTS transaction_sector_lines (
    -- Primary key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Foreign key to transaction (using uuid field as primary identifier)
    transaction_id UUID NOT NULL,
    
    -- Sector classification
    sector_vocabulary TEXT NOT NULL DEFAULT '1', -- '1' = DAC 5 Digit, '2' = DAC 3 Digit  
    sector_code TEXT NOT NULL, -- e.g., '11220'
    sector_name TEXT NOT NULL, -- e.g., 'Primary education'
    
    -- Allocation details
    percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    amount_minor INTEGER NOT NULL, -- Stored in minor units (cents) to avoid float precision issues
    
    -- Display order for UI
    sort_order INTEGER DEFAULT 0,
    
    -- Audit trail
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Soft delete support (following project patterns)
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_transaction_sector UNIQUE(transaction_id, sector_vocabulary, sector_code, deleted_at),
    CONSTRAINT valid_percentage CHECK (percentage > 0 AND percentage <= 100),
    CONSTRAINT valid_amount CHECK (amount_minor >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_sector_lines_transaction_id ON transaction_sector_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_sector_lines_sector_code ON transaction_sector_lines(sector_code);
CREATE INDEX IF NOT EXISTS idx_transaction_sector_lines_created_by ON transaction_sector_lines(created_by);
CREATE INDEX IF NOT EXISTS idx_transaction_sector_lines_deleted_at ON transaction_sector_lines(deleted_at);

-- Add foreign key constraint to transactions table
-- Note: We'll reference the uuid field which is the primary identifier for API operations
DO $$
BEGIN
    -- Check if the foreign key constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_transaction_sector_lines_transaction_id'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE transaction_sector_lines 
        ADD CONSTRAINT fk_transaction_sector_lines_transaction_id 
        FOREIGN KEY (transaction_id) REFERENCES transactions(uuid) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE transaction_sector_lines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies that mirror transaction access patterns
-- Users can view transaction sector lines if they can view the transaction
CREATE POLICY "Users can view transaction sector lines for accessible transactions" 
ON transaction_sector_lines FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM transactions t 
        JOIN activities a ON t.activity_id = a.id 
        WHERE t.uuid = transaction_sector_lines.transaction_id 
        AND (
            -- User created the activity
            a.created_by = auth.uid() OR 
            -- User belongs to the activity's organization (using correct table name)
            EXISTS (
                SELECT 1 FROM user_organizations uo
                WHERE uo.user_id = auth.uid()
                AND uo.organization_id = a.reporting_org_id
            ) OR
            -- User is a contributor to the activity
            EXISTS (
                SELECT 1 FROM activity_contributors ac
                WHERE ac.activity_id = a.id 
                AND ac.user_id = auth.uid()
                AND ac.role IN ('editor', 'admin', 'viewer')
            )
        )
        AND transaction_sector_lines.deleted_at IS NULL
    )
);

-- Users can modify transaction sector lines if they can edit the transaction
CREATE POLICY "Users can modify transaction sector lines for editable transactions" 
ON transaction_sector_lines FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM transactions t 
        JOIN activities a ON t.activity_id = a.id 
        WHERE t.uuid = transaction_sector_lines.transaction_id 
        AND (
            -- User created the activity
            a.created_by = auth.uid() OR 
            -- User belongs to the activity's organization with edit access
            EXISTS (
                SELECT 1 FROM user_organizations uo
                WHERE uo.user_id = auth.uid()
                AND uo.organization_id = a.reporting_org_id
                AND uo.role IN ('admin', 'editor')
            ) OR
            -- User is an accepted contributor with edit permissions
            EXISTS (
                SELECT 1 FROM activity_contributors ac
                WHERE ac.activity_id = a.id 
                AND ac.user_id = auth.uid()
                AND ac.role IN ('editor', 'admin')
            )
        )
        AND transaction_sector_lines.deleted_at IS NULL
    )
);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_transaction_sector_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_transaction_sector_lines_updated_at
    BEFORE UPDATE ON transaction_sector_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_sector_lines_updated_at();

-- Create trigger to set created_by on insert
CREATE OR REPLACE FUNCTION set_transaction_sector_lines_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_transaction_sector_lines_created_by
    BEFORE INSERT ON transaction_sector_lines
    FOR EACH ROW
    EXECUTE FUNCTION set_transaction_sector_lines_created_by();

-- Create view for transaction sector analytics
CREATE OR REPLACE VIEW v_transaction_sector_analytics AS
SELECT 
    t.uuid as transaction_id,
    t.activity_id,
    t.transaction_type,
    t.transaction_date,
    t.value as transaction_value,
    t.currency,
    
    -- Sector information (prioritize transaction-level over activity-level)
    COALESCE(tsl.sector_code, t.sector_code) as sector_code,
    COALESCE(tsl.sector_name, 
        CASE WHEN t.sector_code IS NOT NULL THEN 'Legacy Sector' ELSE NULL END
    ) as sector_name,
    COALESCE(tsl.percentage, 
        CASE WHEN t.sector_code IS NOT NULL THEN 100 ELSE NULL END
    ) as sector_percentage,
    COALESCE(
        (t.value * tsl.percentage / 100), 
        CASE WHEN t.sector_code IS NOT NULL THEN t.value ELSE NULL END
    ) as sector_allocated_value,
    
    -- Metadata
    CASE 
        WHEN tsl.id IS NOT NULL THEN 'transaction' 
        WHEN t.sector_code IS NOT NULL THEN 'legacy'
        ELSE 'none' 
    END as sector_source,
    COALESCE(tsl.sector_vocabulary, t.sector_vocabulary, '1') as sector_vocabulary,
    
    -- Organization information
    t.provider_org_id,
    t.receiver_org_id,
    t.status as transaction_status
    
FROM transactions t
LEFT JOIN transaction_sector_lines tsl ON t.uuid = tsl.transaction_id AND tsl.deleted_at IS NULL
WHERE t.status IN ('actual', 'draft');

-- Grant necessary permissions
GRANT SELECT ON v_transaction_sector_analytics TO authenticated;
GRANT ALL ON transaction_sector_lines TO authenticated;

-- Add helpful comments
COMMENT ON TABLE transaction_sector_lines IS 'Stores sector allocations for individual transactions, enabling transaction-level sector reporting per IATI standards';
COMMENT ON COLUMN transaction_sector_lines.transaction_id IS 'References transactions.uuid for the parent transaction';
COMMENT ON COLUMN transaction_sector_lines.sector_vocabulary IS 'Sector vocabulary code: 1=DAC 5-digit, 2=DAC 3-digit, etc.';
COMMENT ON COLUMN transaction_sector_lines.amount_minor IS 'Amount in minor currency units (cents) to avoid floating point precision issues';
COMMENT ON COLUMN transaction_sector_lines.percentage IS 'Percentage of transaction allocated to this sector (must sum to 100% across all lines)';
COMMENT ON VIEW v_transaction_sector_analytics IS 'Analytics view combining transaction and sector data with priority logic for reporting';
