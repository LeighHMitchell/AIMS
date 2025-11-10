-- Add foreign key columns for provider and receiver organizations to planned_disbursements table
-- This allows planned disbursements to reference actual organization records, not just store text

-- Add provider_org_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'planned_disbursements'
        AND column_name = 'provider_org_id'
    ) THEN
        ALTER TABLE planned_disbursements
        ADD COLUMN provider_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_planned_disbursements_provider_org_id
        ON planned_disbursements(provider_org_id);
    END IF;
END $$;

-- Add receiver_org_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'planned_disbursements'
        AND column_name = 'receiver_org_id'
    ) THEN
        ALTER TABLE planned_disbursements
        ADD COLUMN receiver_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_planned_disbursements_receiver_org_id
        ON planned_disbursements(receiver_org_id);
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN planned_disbursements.provider_org_id IS 'Foreign key reference to the organization providing the funds';
COMMENT ON COLUMN planned_disbursements.receiver_org_id IS 'Foreign key reference to the organization receiving the funds';
