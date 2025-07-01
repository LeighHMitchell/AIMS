-- Add role protection to prevent users from changing their own role
-- Run this after the consolidation migration if you want to protect the role field

-- Create a function to check if role is being changed
CREATE OR REPLACE FUNCTION check_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow super users to change any role
    IF EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user') THEN
        RETURN NEW;
    END IF;
    
    -- For non-super users, prevent role changes
    IF OLD.role IS DISTINCT FROM NEW.role AND NEW.id = auth.uid() THEN
        RAISE EXCEPTION 'Users cannot change their own role';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce role protection
DROP TRIGGER IF EXISTS protect_role_changes ON users;
CREATE TRIGGER protect_role_changes
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION check_role_change();

-- Add a comment explaining the protection
COMMENT ON TRIGGER protect_role_changes ON users IS 
'Prevents non-super users from changing their own role. Super users can change any role.';

-- Test query to verify trigger exists
SELECT 
    tgname as trigger_name,
    tgtype as trigger_type,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'protect_role_changes'; 