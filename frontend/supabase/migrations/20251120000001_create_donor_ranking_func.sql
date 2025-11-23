-- Create function to aggregate transparency scores by reporting organization (donor)
-- This ranks organizations by the average data completeness score of their activities

CREATE OR REPLACE FUNCTION get_donor_transparency_rankings()
RETURNS TABLE (
  org_id UUID,
  org_name TEXT,
  project_count BIGINT,
  average_score NUMERIC,
  projects_good_standing BIGINT,
  good_standing_percent NUMERIC,
  rank BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH donor_scores AS (
    SELECT 
      s.reporting_org_id as org_id,
      s.reporting_org_name as org_name,
      COUNT(*) as project_count,
      AVG(s.total_score) as avg_score,
      COUNT(*) FILTER (WHERE s.total_score >= 80) as good_count
    FROM calculate_transparency_scores() s
    WHERE s.reporting_org_id IS NOT NULL
    GROUP BY s.reporting_org_id, s.reporting_org_name
    HAVING COUNT(*) > 0
  )
  SELECT 
    org_id,
    org_name,
    project_count,
    ROUND(avg_score, 1) as average_score,
    good_count as projects_good_standing,
    CASE 
      WHEN project_count > 0 THEN ROUND((good_count::NUMERIC / project_count::NUMERIC) * 100, 1)
      ELSE 0
    END as good_standing_percent,
    RANK() OVER (ORDER BY avg_score DESC) as rank
  FROM donor_scores
  ORDER BY avg_score DESC, project_count DESC;
END;
$$;
