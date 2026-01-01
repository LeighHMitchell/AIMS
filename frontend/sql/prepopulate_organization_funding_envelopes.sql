-- Prepopulate Organisation Funding Envelopes for Development Partners (2022-2028)
-- This script creates sample funding envelope data for development partner organizations
-- covering past (2022-2024), current (2025), and future (2026-2028) periods

-- Development partners are typically:
-- - Code '10': Government (bilateral donors)
-- - Code '40': Multilateral (UN agencies, World Bank, etc.)
-- - Code '21': International NGO
-- - Code '60': Foundation

-- First, let's identify development partner organizations
-- We'll use organizations with types that typically represent development partners

WITH development_partners AS (
  SELECT 
    id,
    name,
    acronym,
    "Organisation_Type_Code",
    default_currency
  FROM organizations
  WHERE 
    -- Bilateral donors (Government)
    "Organisation_Type_Code" = '10' 
    -- Multilateral organizations
    OR "Organisation_Type_Code" = '40'
    -- International NGOs
    OR "Organisation_Type_Code" = '21'
    -- Foundations
    OR "Organisation_Type_Code" = '60'
  -- Limit to first 10 organizations to avoid too much data
  LIMIT 10
)

-- Insert funding envelope data
INSERT INTO organization_funding_envelopes (
  organization_id,
  period_type,
  year_start,
  year_end,
  amount,
  currency,
  amount_usd,
  flow_direction,
  organization_role,
  funding_type_flags,
  status,
  confidence_level,
  notes,
  created_at,
  updated_at
)
SELECT 
  dp.id AS organization_id,
  
  -- Period configuration
  CASE 
    WHEN year_data.year BETWEEN 2022 AND 2024 THEN 'single_year'
    WHEN year_data.year = 2025 THEN 'single_year'
    ELSE 'single_year'
  END AS period_type,
  
  year_data.year AS year_start,
  NULL AS year_end, -- Single year entries
  
  -- Amount varies by organization type and year
  CASE 
    -- Multilaterals typically have larger amounts
    WHEN dp."Organisation_Type_Code" = '40' THEN 
      CASE 
        WHEN year_data.year BETWEEN 2022 AND 2024 THEN (50000000 + (RANDOM() * 100000000))::DECIMAL(18,2)
        WHEN year_data.year = 2025 THEN (60000000 + (RANDOM() * 120000000))::DECIMAL(18,2)
        ELSE (55000000 + (RANDOM() * 110000000))::DECIMAL(18,2)
      END
    -- Bilateral donors (Government)
    WHEN dp."Organisation_Type_Code" = '10' THEN
      CASE 
        WHEN year_data.year BETWEEN 2022 AND 2024 THEN (20000000 + (RANDOM() * 50000000))::DECIMAL(18,2)
        WHEN year_data.year = 2025 THEN (25000000 + (RANDOM() * 60000000))::DECIMAL(18,2)
        ELSE (22000000 + (RANDOM() * 55000000))::DECIMAL(18,2)
      END
    -- International NGOs
    WHEN dp."Organisation_Type_Code" = '21' THEN
      CASE 
        WHEN year_data.year BETWEEN 2022 AND 2024 THEN (5000000 + (RANDOM() * 15000000))::DECIMAL(18,2)
        WHEN year_data.year = 2025 THEN (6000000 + (RANDOM() * 18000000))::DECIMAL(18,2)
        ELSE (5500000 + (RANDOM() * 16000000))::DECIMAL(18,2)
      END
    -- Foundations
    ELSE
      CASE 
        WHEN year_data.year BETWEEN 2022 AND 2024 THEN (3000000 + (RANDOM() * 10000000))::DECIMAL(18,2)
        WHEN year_data.year = 2025 THEN (3500000 + (RANDOM() * 12000000))::DECIMAL(18,2)
        ELSE (3200000 + (RANDOM() * 11000000))::DECIMAL(18,2)
      END
  END AS amount,
  
  -- Currency (use organization default or common currencies)
  COALESCE(
    dp.default_currency,
    (ARRAY['USD', 'EUR', 'GBP', 'JPY', 'AUD'])[1 + (RANDOM() * 4)::INT]
  ) AS currency,
  
  -- USD amount (approximate conversion, will need proper conversion in production)
  NULL AS amount_usd, -- Can be calculated later using currency conversion
  
  -- Flow direction (most development partners have incoming flows)
  CASE 
    WHEN (RANDOM() * 100) < 85 THEN 'incoming' -- 85% incoming
    ELSE 'outgoing'
  END AS flow_direction,
  
  -- Organization role (varies by type)
  CASE 
    WHEN dp."Organisation_Type_Code" = '10' THEN 'original_funder' -- Governments are typically original funders
    WHEN dp."Organisation_Type_Code" = '40' THEN 
      CASE 
        WHEN (RANDOM() * 100) < 60 THEN 'original_funder'
        ELSE 'fund_manager'
      END
    WHEN dp."Organisation_Type_Code" = '21' THEN
      CASE 
        WHEN (RANDOM() * 100) < 50 THEN 'original_funder'
        WHEN (RANDOM() * 100) < 80 THEN 'fund_manager'
        ELSE 'implementer'
      END
    ELSE 'original_funder'
  END AS organization_role,
  
  -- Funding type flags (array)
  CASE 
    WHEN (RANDOM() * 100) < 40 THEN ARRAY['core_resources']::TEXT[]
    WHEN (RANDOM() * 100) < 70 THEN ARRAY['earmarked_pooled']::TEXT[]
    WHEN (RANDOM() * 100) < 85 THEN ARRAY['on_budget']::TEXT[]
    WHEN (RANDOM() * 100) < 95 THEN ARRAY['off_budget']::TEXT[]
    ELSE ARRAY['core_resources', 'on_budget']::TEXT[]
  END AS funding_type_flags,
  
  -- Status based on year
  CASE 
    WHEN year_data.year BETWEEN 2022 AND 2024 THEN 'actual' -- Past years = actual
    WHEN year_data.year = 2025 THEN 'current' -- Current year
    ELSE 'indicative' -- Future years = indicative
  END AS status,
  
  -- Confidence level (higher for past/current, lower for future)
  CASE 
    WHEN year_data.year BETWEEN 2022 AND 2024 THEN 'high' -- Historical data is high confidence
    WHEN year_data.year = 2025 THEN 
      CASE 
        WHEN (RANDOM() * 100) < 60 THEN 'high'
        WHEN (RANDOM() * 100) < 85 THEN 'medium'
        ELSE 'low'
      END
    ELSE -- Future years
      CASE 
        WHEN (RANDOM() * 100) < 30 THEN 'high'
        WHEN (RANDOM() * 100) < 70 THEN 'medium'
        ELSE 'low'
      END
  END AS confidence_level,
  
  -- Notes (optional contextual information)
  CASE 
    WHEN year_data.year BETWEEN 2022 AND 2024 THEN 
      'Historical actual funding data for ' || year_data.year::TEXT || '. Figures represent confirmed disbursements.'
    WHEN year_data.year = 2025 THEN 
      'Current year funding allocation. Subject to final disbursement confirmation.'
    ELSE 
      'Forward projection for ' || year_data.year::TEXT || '. Indicative figures based on planning assumptions and may be subject to change.'
  END AS notes,
  
  NOW() AS created_at,
  NOW() AS updated_at

FROM development_partners dp
CROSS JOIN (
  -- Generate years 2022-2028
  SELECT 2022 AS year UNION ALL SELECT 2023 UNION ALL SELECT 2024 UNION ALL
  SELECT 2025 UNION ALL SELECT 2026 UNION ALL SELECT 2027 UNION ALL SELECT 2028
) AS year_data

-- Only insert if organization exists and doesn't already have data for that year
WHERE NOT EXISTS (
  SELECT 1 
  FROM organization_funding_envelopes ofe
  WHERE ofe.organization_id = dp.id
    AND ofe.year_start = year_data.year
    AND ofe.year_end IS NULL
);

-- Summary of inserted data
SELECT 
  'Funding envelopes prepopulated' AS status,
  COUNT(*) AS total_records,
  COUNT(DISTINCT organization_id) AS organizations,
  MIN(year_start) AS earliest_year,
  MAX(year_start) AS latest_year,
  SUM(CASE WHEN status = 'actual' THEN 1 ELSE 0 END) AS past_entries,
  SUM(CASE WHEN status = 'current' THEN 1 ELSE 0 END) AS current_entries,
  SUM(CASE WHEN status = 'indicative' THEN 1 ELSE 0 END) AS future_entries
FROM organization_funding_envelopes
WHERE created_at >= NOW() - INTERVAL '1 minute';



