-- Create a simple working unified person view for AIMS Rolodex
-- This view only uses tables that actually exist in the database

DROP VIEW IF EXISTS person_unified_view;

CREATE OR REPLACE VIEW person_unified_view AS
SELECT 
  users.id::text AS id,
  'user' AS source,
  users.name AS full_name,
  users.email,
  users.role,
  users.organization_id,
  NULL AS activity_id,
  NULL AS position,
  NULL AS phone,
  users.created_at,
  users.updated_at,
  -- Derived fields
  COALESCE(users.role, 'User') AS role_label,
  organizations.name AS organization_name,
  NULL AS activity_title,
  organizations.country AS country_code,
  'System User' AS source_label
FROM users
LEFT JOIN organizations ON users.organization_id = organizations.id
WHERE users.email IS NOT NULL AND users.email != '';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_person_unified_view_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_person_unified_view_role ON users (role);

-- Grant access to the view
GRANT SELECT ON person_unified_view TO authenticated;
GRANT SELECT ON person_unified_view TO service_role;

COMMENT ON VIEW person_unified_view IS 'Simplified unified view of persons in the AIMS system from users table only';