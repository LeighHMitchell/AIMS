-- Check current state of subnational_breakdowns

-- 1. Count entries by allocation_level
SELECT
    COALESCE(allocation_level, 'NULL/region') as level,
    COUNT(*) as count
FROM subnational_breakdowns
GROUP BY allocation_level;

-- 2. Check if any township entries exist
SELECT
    sb.region_name,
    sb.allocation_level,
    sb.ts_pcode,
    sb.st_pcode,
    sb.percentage,
    a.title_narrative
FROM subnational_breakdowns sb
JOIN activities a ON a.id = sb.activity_id
WHERE sb.allocation_level = 'township'
   OR sb.ts_pcode IS NOT NULL
LIMIT 20;

-- 3. Sample of what we have (first 20 entries)
SELECT
    sb.region_name,
    sb.allocation_level,
    sb.percentage,
    sb.st_pcode,
    sb.ts_pcode,
    a.title_narrative
FROM subnational_breakdowns sb
JOIN activities a ON a.id = sb.activity_id
ORDER BY a.title_narrative, sb.region_name
LIMIT 20;
