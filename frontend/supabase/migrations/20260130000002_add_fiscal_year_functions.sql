-- Migration: Add fiscal year calculation function
-- This function calculates which fiscal year a given date falls into based on the fiscal year start month/day

-- Function to calculate fiscal year for any date and year type
-- Returns the fiscal year as an integer (e.g., 2024, 2025)
-- For fiscal years starting mid-year, the convention is to label by the END year
-- e.g., July 2024 - June 2025 is "FY 2025" (US convention: Oct 2024 - Sep 2025 = FY 2025)

CREATE OR REPLACE FUNCTION get_fiscal_year(
  p_date DATE,
  p_start_month INTEGER,
  p_start_day INTEGER DEFAULT 1
) RETURNS INTEGER AS $$
DECLARE
  date_year INTEGER;
  date_month INTEGER;
  date_day INTEGER;
BEGIN
  -- Handle NULL date
  IF p_date IS NULL THEN
    RETURN NULL;
  END IF;

  date_year := EXTRACT(YEAR FROM p_date)::INTEGER;
  date_month := EXTRACT(MONTH FROM p_date)::INTEGER;
  date_day := EXTRACT(DAY FROM p_date)::INTEGER;
  
  -- If fiscal year starts in January, just return calendar year
  IF p_start_month = 1 AND p_start_day = 1 THEN
    RETURN date_year;
  END IF;
  
  -- Check if the date is BEFORE the fiscal year start for this calendar year
  -- If so, we're still in the previous fiscal year
  IF date_month < p_start_month OR 
     (date_month = p_start_month AND date_day < p_start_day) THEN
    -- Date is before fiscal year start, so it belongs to fiscal year that STARTED last calendar year
    -- But we label by END year, so it's the current calendar year
    RETURN date_year;
  ELSE
    -- Date is on or after fiscal year start, so it belongs to fiscal year that ENDS next calendar year
    -- We label by END year, so add 1 to current year
    RETURN date_year + 1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Add helpful comment
COMMENT ON FUNCTION get_fiscal_year(DATE, INTEGER, INTEGER) IS 
'Calculates the fiscal year for a given date based on fiscal year start month/day. 
Returns the fiscal year labeled by its END year (standard convention).
Examples:
  - Calendar Year (Jan 1): get_fiscal_year(''2024-06-15'', 1, 1) = 2024
  - US Fiscal Year (Oct 1): get_fiscal_year(''2024-06-15'', 10, 1) = 2024 (in FY ending Sep 2024)
  - US Fiscal Year (Oct 1): get_fiscal_year(''2024-11-15'', 10, 1) = 2025 (in FY ending Sep 2025)
  - Australian FY (Jul 1): get_fiscal_year(''2024-06-15'', 7, 1) = 2024 (in FY ending Jun 2024)
  - Australian FY (Jul 1): get_fiscal_year(''2024-08-15'', 7, 1) = 2025 (in FY ending Jun 2025)';
