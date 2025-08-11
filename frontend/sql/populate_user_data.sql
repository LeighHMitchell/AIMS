-- Populate missing user data for testuser@aims.local
-- Since the columns exist but are empty, we need to populate them

-- First, let's see what data currently exists for your user
SELECT 
  id,
  email,
  first_name,
  last_name,
  job_title,
  role,
  organisation,
  department,
  telephone
FROM users 
WHERE email = 'testuser@aims.local';

-- Update your specific user record with proper values
UPDATE users 
SET 
  first_name = 'Leigh',
  last_name = 'Mitchell',
  job_title = 'System Administrator',
  organisation = 'Agence Française de Développement',
  department = 'International Development'
WHERE email = 'testuser@aims.local';

-- Verify the update
SELECT 
  id,
  email,
  first_name,
  last_name,
  job_title,
  role,
  organisation,
  department
FROM users 
WHERE email = 'testuser@aims.local';
