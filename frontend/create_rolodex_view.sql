-- Create unified person view for AIMS Rolodex
-- This view combines users, organization contacts, and activity personnel into a single queryable source

CREATE OR REPLACE VIEW person_unified_view AS
SELECT 
  users.id::text AS id,
  'user' AS source,
  users.name AS full_name,
  users.email,
  users.role,
  NULL AS organization_id,
  NULL AS activity_id,
  NULL AS position,
  NULL AS phone,
  users.created_at,
  users.updated_at,
  -- Derived fields
  users.role AS role_label,
  NULL AS organization_name,
  NULL AS activity_title,
  NULL AS country_code,
  'System User' AS source_label
FROM users
WHERE users.email IS NOT NULL

UNION ALL

SELECT 
  ('org_' || organization_people.id::text) AS id,
  'organization' AS source,
  organization_people.name AS full_name,
  organization_people.email,
  organization_people.position AS role,
  organization_people.organization_id,
  NULL AS activity_id,
  organization_people.position,
  organization_people.phone,
  organization_people.created_at,
  organization_people.updated_at,
  -- Derived fields
  COALESCE(organization_people.position, 'Organization Contact') AS role_label,
  organizations.name AS organization_name,
  NULL AS activity_title,
  organizations.country AS country_code,
  'Organization Contact' AS source_label
FROM organization_people
LEFT JOIN organizations ON organization_people.organization_id = organizations.id
WHERE organization_people.email IS NOT NULL

UNION ALL

SELECT 
  ('act_' || activity_personnel.id::text) AS id,
  'activity' AS source,
  activity_personnel.name AS full_name,
  activity_personnel.email,
  activity_personnel.role,
  NULL AS organization_id,
  activity_personnel.activity_id,
  activity_personnel.role AS position,
  activity_personnel.phone,
  activity_personnel.created_at,
  activity_personnel.updated_at,
  -- Derived fields
  COALESCE(activity_personnel.role, 'Activity Contact') AS role_label,
  NULL AS organization_name,
  activities.title AS activity_title,
  activities.recipient_country_code AS country_code,
  'Activity Personnel' AS source_label
FROM activity_personnel
LEFT JOIN activities ON activity_personnel.activity_id = activities.id
WHERE activity_personnel.email IS NOT NULL;

-- Create an index on commonly filtered fields for better performance
CREATE INDEX IF NOT EXISTS idx_person_unified_view_email ON person_unified_view USING btree (email);
CREATE INDEX IF NOT EXISTS idx_person_unified_view_source ON person_unified_view USING btree (source);
CREATE INDEX IF NOT EXISTS idx_person_unified_view_role ON person_unified_view USING btree (role_label);

-- Grant access to the view
GRANT SELECT ON person_unified_view TO authenticated;
GRANT SELECT ON person_unified_view TO service_role;

COMMENT ON VIEW person_unified_view IS 'Unified view of all persons in the AIMS system from users, organization contacts, and activity personnel';