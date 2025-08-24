-- Add logo and banner columns to custom_groups table
ALTER TABLE custom_groups ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE custom_groups ADD COLUMN IF NOT EXISTS banner TEXT;

-- Update the view to include logo and banner
DROP VIEW IF EXISTS custom_groups_with_stats;

CREATE VIEW custom_groups_with_stats AS
SELECT 
    cg.*,
    COUNT(DISTINCT cgm.organization_id) as member_count,
    ARRAY_AGG(
        jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'acronym', o.acronym,
            'logo', o.logo,
            'organization_id', o.id,
            'organization_name', o.name,
            'organization', jsonb_build_object(
                'id', o.id,
                'name', o.name,
                'acronym', o.acronym,
                'logo', o.logo
            )
        ) ORDER BY o.name
    ) FILTER (WHERE o.id IS NOT NULL) as members
FROM custom_groups cg
LEFT JOIN custom_group_memberships cgm ON cg.id = cgm.group_id
LEFT JOIN organizations o ON cgm.organization_id = o.id
GROUP BY cg.id;