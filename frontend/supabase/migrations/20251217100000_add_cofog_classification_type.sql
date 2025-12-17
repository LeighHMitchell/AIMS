-- Add COFOG classification type to budget_classifications
-- This enables separate mapping to both national functional classifications and COFOG

-- ============================================================================
-- 1. UPDATE CHECK CONSTRAINT TO ALLOW functional_cofog
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE budget_classifications
  DROP CONSTRAINT IF EXISTS budget_classifications_classification_type_check;

-- Add new constraint with functional_cofog
ALTER TABLE budget_classifications
  ADD CONSTRAINT budget_classifications_classification_type_check
  CHECK (classification_type IN ('administrative', 'functional', 'functional_cofog', 'economic', 'programme'));

-- ============================================================================
-- 2. INSERT COFOG CLASSIFICATIONS (Level 1 - Main divisions)
-- ============================================================================

INSERT INTO budget_classifications (code, name, description, classification_type, level, sort_order) VALUES
  ('01', 'General public services', 'Executive and legislative organs, financial and fiscal affairs, external affairs', 'functional_cofog', 1, 1),
  ('02', 'Defence', 'Military defence, civil defence, foreign military aid', 'functional_cofog', 1, 2),
  ('03', 'Public order and safety', 'Police services, fire-protection services, law courts, prisons', 'functional_cofog', 1, 3),
  ('04', 'Economic affairs', 'General economic, commercial, and labour affairs', 'functional_cofog', 1, 4),
  ('05', 'Environmental protection', 'Waste management, pollution abatement, protection of biodiversity', 'functional_cofog', 1, 5),
  ('06', 'Housing and community amenities', 'Housing development, community development, water supply', 'functional_cofog', 1, 6),
  ('07', 'Health', 'Medical products, appliances, and equipment, outpatient and hospital services', 'functional_cofog', 1, 7),
  ('08', 'Recreation, culture, and religion', 'Recreational and sporting services, cultural services', 'functional_cofog', 1, 8),
  ('09', 'Education', 'Pre-primary, primary, secondary, tertiary education', 'functional_cofog', 1, 9),
  ('10', 'Social protection', 'Sickness and disability, old age, family and children, unemployment', 'functional_cofog', 1, 10)
ON CONFLICT (code, classification_type) DO NOTHING;

-- ============================================================================
-- 3. INSERT COFOG CLASSIFICATIONS (Level 2 - Groups under each division)
-- ============================================================================

-- 01 - General public services (Level 2)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, sort_order)
SELECT
  child.code,
  child.name,
  child.description,
  'functional_cofog',
  parent.id,
  2,
  child.sort_order
FROM (VALUES
  ('01.1', 'Executive and legislative organs, financial and fiscal affairs, external affairs', 'Executive and legislative organs, financial and fiscal affairs, external affairs', 1),
  ('01.2', 'Foreign economic aid', 'Economic aid to developing countries, contributions to international development organizations', 2),
  ('01.3', 'General services', 'General personnel, planning and statistical services, other general services', 3),
  ('01.4', 'Basic research', 'Basic research in general public services', 4),
  ('01.5', 'Research and development related to general public services', 'Applied research related to general public services', 5),
  ('01.6', 'General public services not elsewhere classified', 'General public services n.e.c.', 6),
  ('01.7', 'Public debt transactions', 'Interest payments, transactions in public debt instruments', 7),
  ('01.8', 'Transfers of a general character between different levels of government', 'Transfers between different levels of government', 8)
) AS child(code, name, description, sort_order)
CROSS JOIN budget_classifications parent
WHERE parent.code = '01' AND parent.classification_type = 'functional_cofog'
ON CONFLICT (code, classification_type) DO NOTHING;

-- 02 - Defence (Level 2)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, sort_order)
SELECT
  child.code,
  child.name,
  child.description,
  'functional_cofog',
  parent.id,
  2,
  child.sort_order
FROM (VALUES
  ('02.1', 'Military defence', 'Military and civil defence administration, operation and support', 1),
  ('02.2', 'Civil defence', 'Civil defence administration, operation and support', 2),
  ('02.3', 'Foreign military aid', 'Military aid to foreign governments', 3),
  ('02.4', 'Research and development related to defence', 'Applied research related to defence', 4),
  ('02.5', 'Defence not elsewhere classified', 'Defence n.e.c.', 5)
) AS child(code, name, description, sort_order)
CROSS JOIN budget_classifications parent
WHERE parent.code = '02' AND parent.classification_type = 'functional_cofog'
ON CONFLICT (code, classification_type) DO NOTHING;

-- 03 - Public order and safety (Level 2)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, sort_order)
SELECT
  child.code,
  child.name,
  child.description,
  'functional_cofog',
  parent.id,
  2,
  child.sort_order
FROM (VALUES
  ('03.1', 'Police services', 'Police administration, operation and support', 1),
  ('03.2', 'Fire-protection services', 'Fire-protection administration, operation and support', 2),
  ('03.3', 'Law courts', 'Civil and criminal law courts, administration of fines and settlements', 3),
  ('03.4', 'Prisons', 'Administration and operation of prisons', 4),
  ('03.5', 'Research and development related to public order and safety', 'Applied research related to public order and safety', 5),
  ('03.6', 'Public order and safety not elsewhere classified', 'Public order and safety n.e.c.', 6)
) AS child(code, name, description, sort_order)
CROSS JOIN budget_classifications parent
WHERE parent.code = '03' AND parent.classification_type = 'functional_cofog'
ON CONFLICT (code, classification_type) DO NOTHING;

-- 04 - Economic affairs (Level 2)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, sort_order)
SELECT
  child.code,
  child.name,
  child.description,
  'functional_cofog',
  parent.id,
  2,
  child.sort_order
FROM (VALUES
  ('04.1', 'General economic, commercial, and labour affairs', 'General economic and commercial affairs, general labour affairs', 1),
  ('04.2', 'Agriculture and forestry', 'Agriculture, forestry, fishing and hunting', 2),
  ('04.3', 'Fishing and hunting', 'Fishing and hunting', 3),
  ('04.4', 'Fuel and energy', 'Coal and solid mineral fuels, petroleum and natural gas, nuclear fuel, other fuels, electricity, non-electric energy', 4),
  ('04.5', 'Mining, manufacturing, and construction', 'Mining of mineral resources, manufacturing, construction', 5),
  ('04.6', 'Transport', 'Road, water, railway, air transport, pipeline transport', 6),
  ('04.7', 'Communication', 'Communication administration, operation and support', 7),
  ('04.8', 'Other industries', 'Distributive trades, storage, warehousing, hotels and restaurants, tourism, multipurpose development projects', 8),
  ('04.9', 'Research and development related to economic affairs', 'Applied research related to economic affairs', 9),
  ('04.10', 'Economic affairs not elsewhere classified', 'Economic affairs n.e.c.', 10)
) AS child(code, name, description, sort_order)
CROSS JOIN budget_classifications parent
WHERE parent.code = '04' AND parent.classification_type = 'functional_cofog'
ON CONFLICT (code, classification_type) DO NOTHING;

-- 05 - Environmental protection (Level 2)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, sort_order)
SELECT
  child.code,
  child.name,
  child.description,
  'functional_cofog',
  parent.id,
  2,
  child.sort_order
FROM (VALUES
  ('05.1', 'Waste management', 'Collection, treatment and disposal of waste', 1),
  ('05.2', 'Wastewater management', 'Sewage system operation, wastewater treatment', 2),
  ('05.3', 'Pollution abatement', 'Protection of ambient air, climate, soil, groundwater', 3),
  ('05.4', 'Protection of biodiversity and landscape', 'Protection of species, protection of landscapes and habitats', 4),
  ('05.5', 'Research and development related to environmental protection', 'Applied research related to environmental protection', 5),
  ('05.6', 'Environmental protection not elsewhere classified', 'Administration of environmental protection, environmental protection n.e.c.', 6)
) AS child(code, name, description, sort_order)
CROSS JOIN budget_classifications parent
WHERE parent.code = '05' AND parent.classification_type = 'functional_cofog'
ON CONFLICT (code, classification_type) DO NOTHING;

-- 06 - Housing and community amenities (Level 2)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, sort_order)
SELECT
  child.code,
  child.name,
  child.description,
  'functional_cofog',
  parent.id,
  2,
  child.sort_order
FROM (VALUES
  ('06.1', 'Housing development', 'Housing development, community development', 1),
  ('06.2', 'Community development', 'Community development', 2),
  ('06.3', 'Water supply', 'Water supply administration, supervision, operation, support', 3),
  ('06.4', 'Street lighting', 'Street lighting administration, supervision, operation, support', 4),
  ('06.5', 'Research and development related to housing and community amenities', 'Applied research related to housing and community amenities', 5),
  ('06.6', 'Housing and community amenities not elsewhere classified', 'Housing and community amenities n.e.c.', 6)
) AS child(code, name, description, sort_order)
CROSS JOIN budget_classifications parent
WHERE parent.code = '06' AND parent.classification_type = 'functional_cofog'
ON CONFLICT (code, classification_type) DO NOTHING;

-- 07 - Health (Level 2)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, sort_order)
SELECT
  child.code,
  child.name,
  child.description,
  'functional_cofog',
  parent.id,
  2,
  child.sort_order
FROM (VALUES
  ('07.1', 'Medical products, appliances, and equipment', 'Pharmaceutical products, other medical products, therapeutic appliances and equipment', 1),
  ('07.2', 'Outpatient services', 'General medical services, specialized medical services, dental services, paramedical services', 2),
  ('07.3', 'Hospital services', 'General hospital services, specialized hospital services, medical centre and maternity centre services, nursing and convalescent home services', 3),
  ('07.4', 'Public health services', 'Public health services', 4),
  ('07.5', 'Research and development related to health', 'Applied research related to health', 5),
  ('07.6', 'Health not elsewhere classified', 'Health administration, health n.e.c.', 6)
) AS child(code, name, description, sort_order)
CROSS JOIN budget_classifications parent
WHERE parent.code = '07' AND parent.classification_type = 'functional_cofog'
ON CONFLICT (code, classification_type) DO NOTHING;

-- 08 - Recreation, culture, and religion (Level 2)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, sort_order)
SELECT
  child.code,
  child.name,
  child.description,
  'functional_cofog',
  parent.id,
  2,
  child.sort_order
FROM (VALUES
  ('08.1', 'Recreational and sporting services', 'Recreational and sporting services', 1),
  ('08.2', 'Cultural services', 'Cultural services', 2),
  ('08.3', 'Broadcasting and publishing services', 'Broadcasting and publishing services', 3),
  ('08.4', 'Religious and other community services', 'Religious and other community services', 4),
  ('08.5', 'Research and development related to recreation, culture, and religion', 'Applied research related to recreation, culture, and religion', 5),
  ('08.6', 'Recreation, culture, and religion not elsewhere classified', 'Recreation, culture, and religion n.e.c.', 6)
) AS child(code, name, description, sort_order)
CROSS JOIN budget_classifications parent
WHERE parent.code = '08' AND parent.classification_type = 'functional_cofog'
ON CONFLICT (code, classification_type) DO NOTHING;

-- 09 - Education (Level 2)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, sort_order)
SELECT
  child.code,
  child.name,
  child.description,
  'functional_cofog',
  parent.id,
  2,
  child.sort_order
FROM (VALUES
  ('09.1', 'Pre-primary and primary education', 'Pre-primary education, primary education', 1),
  ('09.2', 'Secondary education', 'Lower-secondary education, upper-secondary education', 2),
  ('09.3', 'Post-secondary non-tertiary education', 'Post-secondary non-tertiary education', 3),
  ('09.4', 'Tertiary education', 'First stage of tertiary education, second stage of tertiary education', 4),
  ('09.5', 'Education not definable by level', 'Education not definable by level', 5),
  ('09.6', 'Subsidiary services to education', 'Subsidiary services to education', 6),
  ('09.7', 'Research and development related to education', 'Applied research related to education', 7),
  ('09.8', 'Education not elsewhere classified', 'Education administration, education n.e.c.', 8)
) AS child(code, name, description, sort_order)
CROSS JOIN budget_classifications parent
WHERE parent.code = '09' AND parent.classification_type = 'functional_cofog'
ON CONFLICT (code, classification_type) DO NOTHING;

-- 10 - Social protection (Level 2)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, sort_order)
SELECT
  child.code,
  child.name,
  child.description,
  'functional_cofog',
  parent.id,
  2,
  child.sort_order
FROM (VALUES
  ('10.1', 'Sickness and disability', 'Sickness, disability', 1),
  ('10.2', 'Old age', 'Old age', 2),
  ('10.3', 'Survivors', 'Survivors', 3),
  ('10.4', 'Family and children', 'Family and children', 4),
  ('10.5', 'Unemployment', 'Unemployment', 5),
  ('10.6', 'Housing', 'Housing', 6),
  ('10.7', 'Research and development related to social protection', 'Applied research related to social protection', 7),
  ('10.8', 'Social protection and social exclusion not elsewhere classified', 'Social protection administration, social protection n.e.c., social exclusion n.e.c.', 8)
) AS child(code, name, description, sort_order)
CROSS JOIN budget_classifications parent
WHERE parent.code = '10' AND parent.classification_type = 'functional_cofog'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Add comment
COMMENT ON COLUMN budget_classifications.classification_type IS 'Type: administrative (ministries), functional (national), functional_cofog (COFOG international), economic (expense types), programme';
