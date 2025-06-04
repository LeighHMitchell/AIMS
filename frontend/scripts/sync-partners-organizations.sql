-- Script to sync partners and organizations tables

-- Step 1: Check what's in each table
SELECT 'Partners Table' as source, COUNT(*) as count FROM partners
UNION ALL
SELECT 'Organizations Table' as source, COUNT(*) as count FROM organizations;

-- Step 2: Find entries only in partners table
SELECT 'Only in Partners' as status, id, name, type, created_at 
FROM partners 
WHERE id NOT IN (SELECT id FROM organizations)
ORDER BY name;

-- Step 3: Find entries only in organizations table
SELECT 'Only in Organizations' as status, id, name, type, created_at 
FROM organizations 
WHERE id NOT IN (SELECT id FROM partners)
ORDER BY name;

-- Step 4: Copy missing entries from partners to organizations
-- UNCOMMENT AND RUN THIS ONLY AFTER REVIEWING THE ABOVE RESULTS
/*
INSERT INTO organizations (id, name, type, created_at, updated_at)
SELECT id, name, type, created_at, updated_at
FROM partners 
WHERE id NOT IN (SELECT id FROM organizations);
*/

-- Step 5: Verify foreign key references
SELECT 'Users with invalid organization_id' as issue, u.id, u.email, u.organization_id
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.organization_id IS NOT NULL AND o.id IS NULL;

-- Step 6: Fix invalid organization references (set to NULL)
-- UNCOMMENT AND RUN THIS ONLY IF NEEDED
/*
UPDATE users 
SET organization_id = NULL
WHERE organization_id IS NOT NULL 
AND organization_id NOT IN (SELECT id FROM organizations);
*/ 