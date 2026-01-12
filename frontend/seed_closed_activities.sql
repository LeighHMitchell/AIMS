-- Seed script to set 3 activities as closed/cancelled/suspended with actual end dates
-- Activity Status Codes:
--   '4' = Closed (Physical activity is complete and fully closed)
--   '5' = Cancelled (The activity has been cancelled before completion)
--   '6' = Suspended (The activity is temporarily suspended)

WITH activities_to_update AS (
    SELECT
        id,
        title_narrative,
        ROW_NUMBER() OVER (ORDER BY updated_at DESC) as rn
    FROM activities
    WHERE activity_status NOT IN ('4', '5', '6')  -- Not already closed/cancelled/suspended
    ORDER BY updated_at DESC
    LIMIT 3
)
UPDATE activities a
SET
    activity_status = CASE
        WHEN au.rn = 1 THEN '4'  -- Closed
        WHEN au.rn = 2 THEN '5'  -- Cancelled
        WHEN au.rn = 3 THEN '6'  -- Suspended
    END,
    actual_end_date = CASE
        WHEN au.rn = 1 THEN (CURRENT_DATE - INTERVAL '30 days')::DATE   -- Closed 30 days ago
        WHEN au.rn = 2 THEN (CURRENT_DATE - INTERVAL '60 days')::DATE   -- Cancelled 60 days ago
        WHEN au.rn = 3 THEN (CURRENT_DATE - INTERVAL '15 days')::DATE   -- Suspended 15 days ago
    END,
    updated_at = NOW()
FROM activities_to_update au
WHERE a.id = au.id;

-- Verify the changes
SELECT
    id,
    LEFT(title_narrative, 45) as title,
    activity_status,
    CASE activity_status
        WHEN '4' THEN 'Closed'
        WHEN '5' THEN 'Cancelled'
        WHEN '6' THEN 'Suspended'
        ELSE 'Other'
    END as status_name,
    actual_end_date,
    planned_end_date,
    updated_at
FROM activities
WHERE activity_status IN ('4', '5', '6')
ORDER BY updated_at DESC
LIMIT 5;
