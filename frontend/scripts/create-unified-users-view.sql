-- This creates a unified view that combines auth and profile data
-- making it appear as a single "table" for easier understanding

-- Drop the view if it exists
DROP VIEW IF EXISTS unified_users CASCADE;

-- Create a view that joins auth.users with public.users
CREATE VIEW unified_users AS
SELECT 
    -- From auth.users (authentication data)
    au.id,
    au.email as auth_email,
    au.created_at as account_created,
    au.last_sign_in_at,
    au.email_confirmed_at,
    
    -- From public.users (profile data)
    pu.email as profile_email,
    pu.first_name,
    pu.last_name,
    pu.middle_name,
    pu.suffix,
    pu.role,
    pu.organisation,
    pu.organization_id,
    pu.department,
    pu.job_title,
    pu.telephone,
    pu.avatar_url,
    pu.is_active,
    
    -- From organizations (joined data)
    o.name as organization_name,
    o.acronym as organization_acronym,
    o.type as organization_type,
    
    -- Computed fields
    CONCAT(pu.first_name, ' ', pu.last_name) as full_name,
    CASE 
        WHEN au.id IS NOT NULL AND pu.id IS NOT NULL THEN 'Synced'
        WHEN au.id IS NOT NULL AND pu.id IS NULL THEN 'No Profile'
        WHEN au.id IS NULL AND pu.id IS NOT NULL THEN 'No Auth'
        ELSE 'Unknown'
    END as sync_status
    
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.organizations o ON pu.organization_id = o.id
ORDER BY COALESCE(au.email, pu.email);

-- Grant permissions
GRANT SELECT ON unified_users TO authenticated;
GRANT SELECT ON unified_users TO anon;

-- Create a function to get a simplified user list
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
    email text,
    name text,
    organization text,
    role text,
    can_login boolean,
    has_profile boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(au.email, pu.email) as email,
        CONCAT(pu.first_name, ' ', pu.last_name) as name,
        CONCAT(o.name, ' (', o.acronym, ')') as organization,
        pu.role,
        (au.id IS NOT NULL) as can_login,
        (pu.id IS NOT NULL) as has_profile
    FROM auth.users au
    FULL OUTER JOIN public.users pu ON au.id = pu.id
    LEFT JOIN public.organizations o ON pu.organization_id = o.id
    ORDER BY email;
END;
$$;

-- Usage examples:
-- SELECT * FROM unified_users;  -- See everything
-- SELECT email, full_name, organization_name, organization_acronym FROM unified_users WHERE sync_status = 'Synced';
-- SELECT * FROM get_all_users();  -- Simplified view