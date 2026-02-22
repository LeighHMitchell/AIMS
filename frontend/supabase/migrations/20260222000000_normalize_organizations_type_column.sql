-- Normalize organizations.type to IATI Organisation Type codes
-- Previously this column contained a mix of IATI codes ("40", "10") and
-- legacy name/slug values ("Government", "development_partner", "multilateral").
-- This migration converts all values to their IATI numeric codes.

UPDATE organizations
SET type = CASE
  -- Government / Bilateral → 10
  WHEN type IN ('Government', 'government', 'Bilateral', 'bilateral') THEN '10'
  -- Local Government → 11
  WHEN type IN ('Local Government', 'local_government') THEN '11'
  -- Other Public Sector → 15
  WHEN type IN ('Other Public Sector', 'other_public_sector') THEN '15'
  -- International NGO → 21
  WHEN type IN ('International NGO', 'international_ngo', 'NGO', 'ngo', 'ingo') THEN '21'
  -- National NGO → 22
  WHEN type IN ('National NGO', 'national_ngo') THEN '22'
  -- Regional NGO → 23
  WHEN type IN ('Regional NGO', 'regional_ngo', 'civil_society') THEN '23'
  -- Partner Country based NGO → 24
  WHEN type IN ('Partner Country based NGO', 'partner_country_ngo') THEN '24'
  -- Public Private Partnership → 30
  WHEN type IN ('Public Private Partnership', 'public_private_partnership') THEN '30'
  -- Multilateral → 40
  WHEN type IN ('Multilateral', 'multilateral', 'Development Partner', 'development_partner', 'un', 'International Financial Institution', 'Other Multilateral', 'partner_government') THEN '40'
  -- Foundation → 60
  WHEN type IN ('Foundation', 'foundation') THEN '60'
  -- Private Sector → 70
  WHEN type IN ('Private Sector', 'private_sector') THEN '70'
  -- Academic, Training and Research → 80
  WHEN type IN ('Academic', 'academic', 'Academic, Training and Research') THEN '80'
  -- Other → 90
  WHEN type IN ('Other', 'other', 'implementing_partner') THEN '90'
  -- Already a valid IATI code — keep as-is
  WHEN type IN ('10', '11', '15', '21', '22', '23', '24', '30', '40', '60', '70', '71', '72', '73', '80', '90') THEN type
  -- Anything else → 90 (Other)
  WHEN type IS NOT NULL THEN '90'
  -- NULL stays NULL
  ELSE NULL
END
WHERE type IS NOT NULL;
