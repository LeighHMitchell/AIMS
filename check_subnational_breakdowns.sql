-- ============================================================================
-- Check current state of subnational_breakdowns table
-- ============================================================================

-- 1. Count by allocation_level
SELECT
    allocation_level,
    COUNT(*) as count
FROM subnational_breakdowns
GROUP BY allocation_level;

-- 2. Sample of township-level entries (if any exist)
SELECT
    sb.id,
    a.title_narrative,
    sb.region_name,
    sb.percentage,
    sb.allocation_level,
    sb.st_pcode,
    sb.ts_pcode
FROM subnational_breakdowns sb
JOIN activities a ON a.id = sb.activity_id
WHERE sb.allocation_level = 'township'
LIMIT 20;

-- 3. Sample of region-level entries
SELECT
    sb.id,
    a.title_narrative,
    sb.region_name,
    sb.percentage,
    sb.allocation_level,
    sb.st_pcode
FROM subnational_breakdowns sb
JOIN activities a ON a.id = sb.activity_id
WHERE sb.allocation_level = 'region' OR sb.allocation_level IS NULL
LIMIT 20;

-- 4. Check which activities have breakdowns and their total percentages
SELECT
    a.title_narrative,
    sb.allocation_level,
    COUNT(*) as breakdown_count,
    SUM(sb.percentage) as total_percentage
FROM subnational_breakdowns sb
JOIN activities a ON a.id = sb.activity_id
GROUP BY a.title_narrative, sb.allocation_level
ORDER BY a.title_narrative;
