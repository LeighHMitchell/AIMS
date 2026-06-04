-- Populate short, plain-language descriptions for the 12 official
-- OECD-DAC / IATI v2.03 policy markers. Matched by iati_code and scoped to the
-- IATI-standard set so custom markers are left untouched.

UPDATE policy_markers SET description = 'Activities that have gender equality and women''s empowerment as policy objectives'
  WHERE is_iati_standard = true AND iati_code = '1';

UPDATE policy_markers SET description = 'Activities that support environmental protection, sustainability, or enhancement'
  WHERE is_iati_standard = true AND iati_code = '2';

UPDATE policy_markers SET description = 'Activities that strengthen democratic governance, accountability, and civil society participation'
  WHERE is_iati_standard = true AND iati_code = '3';

UPDATE policy_markers SET description = 'Activities that build trade capacity and support trade facilitation and policy'
  WHERE is_iati_standard = true AND iati_code = '4';

UPDATE policy_markers SET description = 'Activities that promote the conservation, sustainable use, and fair sharing of biodiversity'
  WHERE is_iati_standard = true AND iati_code = '5';

UPDATE policy_markers SET description = 'Activities that reduce greenhouse gas emissions or enhance carbon sinks to mitigate climate change'
  WHERE is_iati_standard = true AND iati_code = '6';

UPDATE policy_markers SET description = 'Activities that reduce the vulnerability of people and systems to the effects of climate change'
  WHERE is_iati_standard = true AND iati_code = '7';

UPDATE policy_markers SET description = 'Activities that combat desertification or mitigate the effects of drought'
  WHERE is_iati_standard = true AND iati_code = '8';

UPDATE policy_markers SET description = 'Activities that improve reproductive, maternal, newborn, and child health'
  WHERE is_iati_standard = true AND iati_code = '9';

UPDATE policy_markers SET description = 'Activities that prevent, prepare for, and reduce the risk of disasters'
  WHERE is_iati_standard = true AND iati_code = '10';

UPDATE policy_markers SET description = 'Activities that promote the rights and inclusion of persons with disabilities'
  WHERE is_iati_standard = true AND iati_code = '11';

UPDATE policy_markers SET description = 'Activities that improve nutrition outcomes and address malnutrition'
  WHERE is_iati_standard = true AND iati_code = '12';
