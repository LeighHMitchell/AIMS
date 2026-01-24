-- Sync country_represented column with country column for all organizations
UPDATE organizations 
SET country_represented = country 
WHERE country IS NOT NULL 
  AND (country_represented IS NULL OR country_represented != country);
