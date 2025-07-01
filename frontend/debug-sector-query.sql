-- Debug query to check sector persistence for activity
-- Replace the activity ID with the one from your logs

-- Check if sectors exist for the activity
SELECT 
    a.id as activity_id,
    a.title,
    COUNT(s.id) as sector_count,
    json_agg(
        json_build_object(
            'id', s.id,
            'code', s.code,
            'percentage', s.percentage,
            'created_at', s.created_at
        )
    ) FILTER (WHERE s.id IS NOT NULL) as sectors
FROM activities a
LEFT JOIN sectors s ON s.activity_id = a.id
WHERE a.id = '51a1fcab-4f1a-48be-8592-292eef27dc55'  -- Your Mohican activity
GROUP BY a.id, a.title;

-- Also check the raw sectors table
SELECT * FROM sectors 
WHERE activity_id = '51a1fcab-4f1a-48be-8592-292eef27dc55'
ORDER BY created_at DESC;

-- Check if there are any sectors at all in the database
SELECT COUNT(*) as total_sectors FROM sectors;

-- Check the most recent sectors added
SELECT 
    s.*,
    a.title as activity_title
FROM sectors s
JOIN activities a ON a.id = s.activity_id
ORDER BY s.created_at DESC
LIMIT 10; 