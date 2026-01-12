-- Seed script to populate created_by field for activities
-- This assigns a creator to activities that don't have one

-- First, let's see what users exist
SELECT id, first_name, last_name, department, email FROM users LIMIT 10;

-- Update users who don't have a department set
UPDATE users
SET department = 'Development Cooperation Division'
WHERE department IS NULL OR department = '';

-- Update activities to have a created_by user
-- This will assign the first available user to all activities without a creator
WITH first_user AS (
    SELECT id FROM users LIMIT 1
)
UPDATE activities
SET created_by = (SELECT id FROM first_user)
WHERE created_by IS NULL;

-- Verify the update
SELECT
    a.id,
    LEFT(a.title_narrative, 40) as title,
    a.created_by,
    CONCAT(u.first_name, ' ', u.last_name) as creator_name,
    u.department as creator_department,
    a.created_at
FROM activities a
LEFT JOIN users u ON a.created_by = u.id
LIMIT 10;
