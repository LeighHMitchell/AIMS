-- Add contributor role column to activity_contributors table
ALTER TABLE activity_contributors 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'contributor' CHECK (role IN ('funder', 'implementer', 'coordinator', 'contributor', 'partner'));

-- Add comment to explain the role column
COMMENT ON COLUMN activity_contributors.role IS 'Role of the organization in the activity: funder, implementer, coordinator, contributor, partner';

-- Create index for better query performance on role filtering
CREATE INDEX IF NOT EXISTS idx_activity_contributors_role ON activity_contributors(role);

-- Add a display_order column to control how contributors are shown in UI
ALTER TABLE activity_contributors 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add comment for display_order
COMMENT ON COLUMN activity_contributors.display_order IS 'Order in which contributors should be displayed in UI (0 = highest priority)';

-- Create index for display ordering
CREATE INDEX IF NOT EXISTS idx_activity_contributors_display_order ON activity_contributors(activity_id, display_order);

-- Update existing contributors to have default roles based on common patterns
-- Organizations with "fund" in transactions typically get 'funder' role
-- Organizations with implementing data typically get 'implementer' role
UPDATE activity_contributors 
SET role = 'funder'
WHERE role = 'contributor' 
AND organization_id IN (
    SELECT DISTINCT provider_org 
    FROM transactions 
    WHERE transaction_type = 'C' -- Commitment transactions indicate funding
    AND provider_org = activity_contributors.organization_id
);

UPDATE activity_contributors 
SET role = 'implementer'
WHERE role = 'contributor' 
AND organization_id IN (
    SELECT DISTINCT receiver_org 
    FROM transactions 
    WHERE transaction_type = 'D' -- Disbursement transactions indicate implementation
    AND receiver_org = activity_contributors.organization_id
);

-- Set display order based on role importance
UPDATE activity_contributors 
SET display_order = CASE 
    WHEN role = 'funder' THEN 1
    WHEN role = 'implementer' THEN 2
    WHEN role = 'coordinator' THEN 3
    WHEN role = 'partner' THEN 4
    ELSE 5
END; 