-- Create function to calculate transparency scores for all activities
-- Scores are based on the "2026 Aid Transparency Index Technical Paper" methodology

-- Drop existing function if it exists (needed when changing return type)
DROP FUNCTION IF EXISTS calculate_transparency_scores();

CREATE OR REPLACE FUNCTION calculate_transparency_scores()
RETURNS TABLE (
  id UUID,
  title TEXT,
  reporting_org_id UUID,
  reporting_org_name TEXT,
  partner_name TEXT,
  updated_at TIMESTAMPTZ,
  total_score NUMERIC,
  breakdown JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_fiscal_year INTEGER;
BEGIN
  current_fiscal_year := EXTRACT(YEAR FROM CURRENT_DATE);

  RETURN QUERY
  WITH score_components AS (
    SELECT
      a.id,
      a.title_narrative as title,
      a.reporting_org_id,
      o.name as reporting_org_name,
      p.name as partner_name,
      a.updated_at,
      
      -- 1. Operational Planning (10 pts)
      -- Check for MoU (A09) or Registration ID (other_identifier/iati_identifier)
      (CASE WHEN 
          EXISTS (SELECT 1 FROM activity_documents ad WHERE ad.activity_id = a.id AND ad.category_code = 'A09') 
          OR a.other_identifier IS NOT NULL 
          OR a.iati_identifier IS NOT NULL
       THEN 5 ELSE 0 END) as score_op_reg,
       
      -- Check for Country Strategy (A01/A02)
      (CASE WHEN 
          EXISTS (SELECT 1 FROM activity_documents ad WHERE ad.activity_id = a.id AND ad.category_code IN ('A01', 'A02')) 
       THEN 5 ELSE 0 END) as score_op_strat,

      -- 2. Finance & Budgets (30 pts)
      -- Forward Budget (N+1)
      (CASE WHEN 
          EXISTS (SELECT 1 FROM activity_budgets ab 
                  WHERE ab.activity_id = a.id 
                  AND EXTRACT(YEAR FROM ab.period_start) = current_fiscal_year + 1
                  AND ab.value > 0)
       THEN 10 ELSE 0 END) as score_fin_budget,
       
      -- Transaction Currency defined (default_currency or any transaction with currency)
      (CASE WHEN a.default_currency IS NOT NULL THEN 5 ELSE 0 END) as score_fin_currency,
      
      -- Disbursements in current year (if Implementation)
      (CASE WHEN 
          a.activity_status = '2' -- Implementation
          AND EXISTS (SELECT 1 FROM transactions t 
                      WHERE t.activity_id = a.id 
                      AND t.transaction_type = '3' -- Disbursement
                      AND EXTRACT(YEAR FROM t.transaction_date) = current_fiscal_year
                      AND t.value > 0)
       THEN 10 
       WHEN a.activity_status != '2' THEN 10 -- Auto-award if not in implementation (not applicable)
       ELSE 0 END) as score_fin_disburse,
       
      -- Capital Expenditure (capital_spend_percentage is not null)
      (CASE WHEN a.capital_spend_percentage IS NOT NULL THEN 5 ELSE 0 END) as score_fin_capex,

      -- 3. Project Attributes (25 pts)
      -- Title > 10 chars
      (CASE WHEN LENGTH(COALESCE(a.title_narrative, '')) > 10 THEN 5 ELSE 0 END) as score_attr_title,
      
      -- Description > 80 chars
      (CASE WHEN LENGTH(COALESCE(a.description_narrative, '')) > 80 THEN 10 ELSE 0 END) as score_attr_desc,
      
      -- Dates present
      (CASE WHEN a.planned_start_date IS NOT NULL AND a.planned_end_date IS NOT NULL THEN 5 ELSE 0 END) as score_attr_dates,
      
      -- Status valid
      (CASE WHEN a.activity_status IS NOT NULL THEN 5 ELSE 0 END) as score_attr_status,

      -- 4. Joining-Up Data (15 pts)
      -- Location (at least one)
      (CASE WHEN 
          EXISTS (SELECT 1 FROM activity_locations al WHERE al.activity_id = a.id) 
       THEN 10 ELSE 0 END) as score_join_loc,
       
      -- Sector (at least one)
      (CASE WHEN 
          EXISTS (SELECT 1 FROM activity_sectors as_sec WHERE as_sec.activity_id = a.id)
       THEN 5 ELSE 0 END) as score_join_sector,

      -- 5. Performance (20 pts)
      -- Objectives (at least one indicator)
      (CASE WHEN 
          EXISTS (SELECT 1 FROM activity_results ar 
                  JOIN result_indicators ri ON ri.result_id = ar.id 
                  WHERE ar.activity_id = a.id)
       THEN 10 ELSE 0 END) as score_perf_obj,
       
      -- Results (actual value recorded)
      (CASE WHEN 
          EXISTS (SELECT 1 FROM activity_results ar 
                  JOIN result_indicators ri ON ri.result_id = ar.id 
                  JOIN indicator_periods ip ON ip.indicator_id = ri.id
                  WHERE ar.activity_id = a.id AND ip.actual_value IS NOT NULL)
       THEN 10 ELSE 0 END) as score_perf_results,
       
      -- Timeliness Multiplier
      (CASE 
          WHEN a.updated_at >= NOW() - INTERVAL '90 days' THEN 1.0
          WHEN a.updated_at >= NOW() - INTERVAL '180 days' THEN 0.9
          ELSE 0.5
       END) as time_multiplier

    FROM activities a
    LEFT JOIN partners p ON a.partner_id = p.id
    LEFT JOIN organizations o ON a.reporting_org_id = o.id
  )
  SELECT
    id,
    title,
    reporting_org_id,
    COALESCE(reporting_org_name, 'Unknown Organization') as reporting_org_name,
    COALESCE(partner_name, 'Unknown Partner') as partner_name,
    updated_at,
    -- Calculate Total Weighted Score
    ROUND(
      (
        score_op_reg + score_op_strat +
        score_fin_budget + score_fin_currency + score_fin_disburse + score_fin_capex +
        score_attr_title + score_attr_desc + score_attr_dates + score_attr_status +
        score_join_loc + score_join_sector +
        score_perf_obj + score_perf_results
      ) * time_multiplier
    , 1) as total_score,
    
    -- JSON Breakdown for UI Drill-down
    jsonb_build_object(
      'operational_planning', jsonb_build_object(
        'score', (score_op_reg + score_op_strat),
        'details', jsonb_build_array(
          jsonb_build_object('label', 'MoU / Registration', 'points', score_op_reg, 'max', 5),
          jsonb_build_object('label', 'Country Strategy', 'points', score_op_strat, 'max', 5)
        )
      ),
      'finance', jsonb_build_object(
        'score', (score_fin_budget + score_fin_currency + score_fin_disburse + score_fin_capex),
        'details', jsonb_build_array(
          jsonb_build_object('label', 'Forward Budget (N+1)', 'points', score_fin_budget, 'max', 10),
          jsonb_build_object('label', 'Currency Defined', 'points', score_fin_currency, 'max', 5),
          jsonb_build_object('label', 'Disbursements (Current Year)', 'points', score_fin_disburse, 'max', 10),
          jsonb_build_object('label', 'Capital Expenditure', 'points', score_fin_capex, 'max', 5)
        )
      ),
      'attributes', jsonb_build_object(
        'score', (score_attr_title + score_attr_desc + score_attr_dates + score_attr_status),
        'details', jsonb_build_array(
          jsonb_build_object('label', 'Title Quality (>10 chars)', 'points', score_attr_title, 'max', 5),
          jsonb_build_object('label', 'Description Quality (>80 chars)', 'points', score_attr_desc, 'max', 10),
          jsonb_build_object('label', 'Valid Dates', 'points', score_attr_dates, 'max', 5),
          jsonb_build_object('label', 'Valid Status', 'points', score_attr_status, 'max', 5)
        )
      ),
      'joining_up', jsonb_build_object(
        'score', (score_join_loc + score_join_sector),
        'details', jsonb_build_array(
          jsonb_build_object('label', 'Locations Mapped', 'points', score_join_loc, 'max', 10),
          jsonb_build_object('label', 'Sector Assigned', 'points', score_join_sector, 'max', 5)
        )
      ),
      'performance', jsonb_build_object(
        'score', (score_perf_obj + score_perf_results),
        'details', jsonb_build_array(
          jsonb_build_object('label', 'Objectives/Indicators', 'points', score_perf_obj, 'max', 10),
          jsonb_build_object('label', 'Results Reported', 'points', score_perf_results, 'max', 10)
        )
      ),
      'multiplier', time_multiplier
    ) as breakdown
  FROM score_components
  ORDER BY total_score DESC;
END;
$$;
