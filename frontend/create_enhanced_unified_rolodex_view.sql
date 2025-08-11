-- Enhanced unified person view for AIMS Rolodex
-- This view combines data from users and activity_contacts tables with improved organization handling

DROP VIEW IF EXISTS person_unified_view CASCADE;
DROP FUNCTION IF EXISTS search_unified_rolodex;

CREATE OR REPLACE VIEW person_unified_view AS
-- Users from the users table (System Users)
SELECT 
  users.id::text AS id,
  'user'::text AS source_type,
  COALESCE(
    NULLIF(TRIM(CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, ''))), ''), 
    users.email,
    'Unknown User'
  ) AS name,
  users.email AS email,
  users.role AS role,
  users.organization_id AS organization_id,
  users.organisation AS organisation_name, -- Text field from users table
  users.telephone AS phone,
  NULL::text AS fax,
  NULL::uuid AS activity_id,
  NULL::text AS notes,
  users.avatar_url AS profile_photo,
  users.created_at AS created_at,
  users.updated_at AS updated_at,
  -- Derived fields for display
  COALESCE(users.role, 'User') AS role_label,
  COALESCE(organizations.name, users.organisation) AS organization_display_name,
  NULL::text AS activity_title,
  organizations.country AS country_code,
  'System User' AS source_label,
  users.job_title AS position,
  -- Additional fields for filtering
  true AS active_status
FROM users
LEFT JOIN organizations ON users.organization_id = organizations.id
WHERE users.email IS NOT NULL AND users.email != ''

UNION ALL

-- Contacts from activity_contacts table (Activity Contacts)
SELECT 
  activity_contacts.id::text AS id,
  'activity_contact'::text AS source_type,
  COALESCE(
    NULLIF(TRIM(CONCAT(
      COALESCE(activity_contacts.first_name, ''), 
      CASE WHEN activity_contacts.middle_name IS NOT NULL AND activity_contacts.middle_name != '' 
           THEN ' ' || activity_contacts.middle_name ELSE '' END,
      CASE WHEN activity_contacts.last_name IS NOT NULL AND activity_contacts.last_name != ''
           THEN ' ' || activity_contacts.last_name ELSE '' END
    )), ''),
    activity_contacts.email,
    'Unknown Contact'
  ) AS name,
  activity_contacts.email AS email,
  activity_contacts.position AS role,
  activity_contacts.organisation_id AS organization_id, -- Can link to organizations table
  activity_contacts.organisation AS organisation_name, -- Text field for organization name
  activity_contacts.phone AS phone,
  activity_contacts.fax AS fax,
  activity_contacts.activity_id AS activity_id,
  activity_contacts.notes AS notes,
  activity_contacts.profile_photo AS profile_photo,
  activity_contacts.created_at AS created_at,
  activity_contacts.updated_at AS updated_at,
  -- Derived fields for display
  COALESCE(
    activity_contacts.type, 
    activity_contacts.position, 
    'Contact'
  ) AS role_label,
  COALESCE(
    linked_orgs.name,  -- Linked organization name
    activity_contacts.organisation, -- Text organization name
    'No Organization'
  ) AS organization_display_name,
  COALESCE(activities.title_narrative, activities.title) AS activity_title,
  COALESCE(
    linked_orgs.country, -- Country from linked organization
    activities.recipient_country -- Activity country
  ) AS country_code,
  CASE 
    WHEN activity_contacts.type IS NOT NULL 
    THEN CONCAT('Activity Contact - ', activity_contacts.type)
    ELSE 'Activity Contact'
  END AS source_label,
  activity_contacts.position AS position,
  -- Additional fields for consistency
  true AS active_status
FROM activity_contacts
LEFT JOIN activities ON activity_contacts.activity_id = activities.id
LEFT JOIN organizations linked_orgs ON activity_contacts.organisation_id = linked_orgs.id
WHERE (
  (activity_contacts.email IS NOT NULL AND activity_contacts.email != '') 
  OR (activity_contacts.first_name IS NOT NULL AND activity_contacts.first_name != '')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email_not_null ON users (email) WHERE email IS NOT NULL AND email != '';
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users (organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_contacts_email_not_null ON activity_contacts (email) WHERE email IS NOT NULL AND email != '';
CREATE INDEX IF NOT EXISTS idx_activity_contacts_activity_id ON activity_contacts (activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_contacts_organisation_id ON activity_contacts (organisation_id);

-- Grant access to the view
GRANT SELECT ON person_unified_view TO authenticated;
GRANT SELECT ON person_unified_view TO service_role;

COMMENT ON VIEW person_unified_view IS 'Enhanced unified view of all persons in the AIMS system from users and activity_contacts tables with improved organization handling';

-- Enhanced search function with better filtering capabilities
CREATE OR REPLACE FUNCTION search_unified_rolodex(
  p_search text DEFAULT NULL,
  p_source_type text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL,
  p_activity_id uuid DEFAULT NULL,
  p_country_code text DEFAULT NULL,
  p_limit int DEFAULT 25,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id text,
  source_type text,
  name text,
  email text,
  role text,
  organization_id uuid,
  organisation_name text,
  phone text,
  fax text,
  activity_id uuid,
  notes text,
  profile_photo text,
  created_at timestamptz,
  updated_at timestamptz,
  role_label text,
  organization_display_name text,
  activity_title text,
  country_code text,
  source_label text,
  "position" text,
  active_status boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    puv.id,
    puv.source_type,
    puv.name,
    puv.email,
    puv.role,
    puv.organization_id,
    puv.organisation_name,
    puv.phone,
    puv.fax,
    puv.activity_id,
    puv.notes,
    puv.profile_photo,
    puv.created_at,
    puv.updated_at,
    puv.role_label,
    puv.organization_display_name,
    puv.activity_title,
    puv.country_code,
    puv.source_label,
    puv."position",
    puv.active_status
  FROM person_unified_view puv
  WHERE 
    -- Search filter (comprehensive text search)
    (p_search IS NULL OR (
      puv.name ILIKE '%' || p_search || '%' OR
      puv.email ILIKE '%' || p_search || '%' OR
      puv.role ILIKE '%' || p_search || '%' OR
      puv.role_label ILIKE '%' || p_search || '%' OR
      puv.organisation_name ILIKE '%' || p_search || '%' OR
      puv.organization_display_name ILIKE '%' || p_search || '%' OR
      puv.activity_title ILIKE '%' || p_search || '%' OR
      puv.position ILIKE '%' || p_search || '%'
    ))
    -- Source type filter
    AND (p_source_type IS NULL OR puv.source_type = p_source_type)
    -- Role filter (search both role and role_label)
    AND (p_role IS NULL OR (
      puv.role ILIKE '%' || p_role || '%' OR
      puv.role_label ILIKE '%' || p_role || '%'
    ))
    -- Organization filter
    AND (p_organization_id IS NULL OR puv.organization_id = p_organization_id)
    -- Activity filter
    AND (p_activity_id IS NULL OR puv.activity_id = p_activity_id)
    -- Country filter
    AND (p_country_code IS NULL OR puv.country_code = p_country_code)
  ORDER BY 
    puv.source_type, -- Group by type first
    puv.name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION search_unified_rolodex TO authenticated;
GRANT EXECUTE ON FUNCTION search_unified_rolodex TO service_role;

-- Statistics function to get counts by contact type
CREATE OR REPLACE FUNCTION get_rolodex_stats()
RETURNS TABLE (
  contact_type text,
  count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    puv.source_type as contact_type,
    COUNT(*) as count
  FROM person_unified_view puv
  GROUP BY puv.source_type
  ORDER BY puv.source_type;
END;
$$;

GRANT EXECUTE ON FUNCTION get_rolodex_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_rolodex_stats TO service_role;
