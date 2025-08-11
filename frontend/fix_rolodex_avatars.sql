-- Fix profile photos in Rolodex by updating the unified view
-- This script updates the person_unified_view to properly map users.avatar_url to profile_photo

DROP VIEW IF EXISTS person_unified_view;

CREATE VIEW person_unified_view AS
-- System users with their profile data
SELECT 
  users.id::text AS id,
  'user' AS source_type,
  COALESCE(NULLIF(TRIM(CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, ''))), ''), users.email) AS name,
  users.email AS email,
  users.role AS role,
  users.organization_id AS organization_id,
  NULL::text AS organisation_name,
  NULL::text AS phone,
  NULL::text AS fax,
  NULL::uuid AS activity_id,
  NULL::text AS notes,
  users.avatar_url AS profile_photo,
  users.created_at AS created_at,
  users.updated_at AS updated_at,
  -- Derived fields for display
  COALESCE(users.role, 'User') AS role_label,
  organizations.name AS organization_display_name,
  NULL::text AS activity_title,
  organizations.country AS country_code,
  'System User' AS source_label,
  users.position AS "position",
  true AS active_status
FROM users
LEFT JOIN organizations ON users.organization_id = organizations.id

UNION ALL

-- Activity contacts 
SELECT
  activity_contacts.id::text AS id,
  'activity_contact' AS source_type,
  activity_contacts.name AS name,
  activity_contacts.email AS email,
  activity_contacts.role AS role,
  activity_contacts.organisation_id AS organization_id,
  activity_contacts.organisation_name AS organisation_name,
  activity_contacts.phone AS phone,
  activity_contacts.fax AS fax,
  activity_contacts.activity_id AS activity_id,
  activity_contacts.notes AS notes,
  activity_contacts.profile_photo AS profile_photo,
  activity_contacts.created_at AS created_at,
  activity_contacts.updated_at AS updated_at,
  -- Derived fields for display
  COALESCE(activity_contacts.role, 'Contact') AS role_label,
  COALESCE(organizations.name, activity_contacts.organisation_name) AS organization_display_name,
  COALESCE(activities.title_narrative, activities.title) AS activity_title,
  COALESCE(organizations.country, activities.recipient_country) AS country_code,
  'Activity Contact' AS source_label,
  activity_contacts.position AS "position",
  true AS active_status
FROM activity_contacts
LEFT JOIN organizations ON activity_contacts.organisation_id = organizations.id
LEFT JOIN activities ON activity_contacts.activity_id = activities.id;

-- Grant permissions
GRANT SELECT ON person_unified_view TO authenticated;
GRANT SELECT ON person_unified_view TO service_role;

COMMENT ON VIEW person_unified_view IS 'Unified view of all persons in the AIMS system from users and activity_contacts tables - with profile photos';
