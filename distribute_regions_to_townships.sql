-- ============================================================================
-- Distribute Region-level Breakdowns to Townships
-- ============================================================================
-- This script converts region-level subnational breakdowns to township-level
-- by distributing each region's percentage equally across all its townships.
--
-- Example: If an activity has "Kachin State" at 100%, this creates entries
-- for all 16 Kachin townships, each with 100%/16 = 6.25%
-- ============================================================================

-- ============================================================================
-- STEP 1: Create township-to-region mapping table
-- ============================================================================
-- This maps each township to its parent region with proper naming

DROP TABLE IF EXISTS tmp_township_mapping;
CREATE TEMP TABLE tmp_township_mapping (
  ts_name TEXT,
  ts_pcode TEXT,
  st_name TEXT,        -- Short name from GeoJSON (e.g., "Kachin")
  st_pcode TEXT,
  region_name TEXT     -- Full name used in breakdowns (e.g., "Kachin State")
);

-- Insert all townships with their parent regions
-- Data extracted from myanmar-townships GeoJSON
INSERT INTO tmp_township_mapping (ts_name, ts_pcode, st_name, st_pcode, region_name) VALUES
-- Kachin State (MMR001) - 16 townships
('Bhamo', 'MMR001010', 'Kachin', 'MMR001', 'Kachin State'),
('Chipwi', 'MMR001005', 'Kachin', 'MMR001', 'Kachin State'),
('Injangyang', 'MMR001003', 'Kachin', 'MMR001', 'Kachin State'),
('Machanbaw', 'MMR001016', 'Kachin', 'MMR001', 'Kachin State'),
('Mansi', 'MMR001013', 'Kachin', 'MMR001', 'Kachin State'),
('Mogaung', 'MMR001008', 'Kachin', 'MMR001', 'Kachin State'),
('Mohnyin', 'MMR001007', 'Kachin', 'MMR001', 'Kachin State'),
('Momauk', 'MMR001012', 'Kachin', 'MMR001', 'Kachin State'),
('Myitkyina', 'MMR001001', 'Kachin', 'MMR001', 'Kachin State'),
('Puta-O', 'MMR001014', 'Kachin', 'MMR001', 'Kachin State'),
('Shwegu', 'MMR001011', 'Kachin', 'MMR001', 'Kachin State'),
('Sumprabum', 'MMR001015', 'Kachin', 'MMR001', 'Kachin State'),
('Tanai', 'MMR001004', 'Kachin', 'MMR001', 'Kachin State'),
('Tsawlaw', 'MMR001006', 'Kachin', 'MMR001', 'Kachin State'),
('Waingmaw', 'MMR001002', 'Kachin', 'MMR001', 'Kachin State'),
('Hpakant', 'MMR001009', 'Kachin', 'MMR001', 'Kachin State'),

-- Kayah State (MMR002) - 7 townships
('Bawlakhe', 'MMR002005', 'Kayah', 'MMR002', 'Kayah State'),
('Demoso', 'MMR002002', 'Kayah', 'MMR002', 'Kayah State'),
('Hpasawng', 'MMR002006', 'Kayah', 'MMR002', 'Kayah State'),
('Hpruso', 'MMR002003', 'Kayah', 'MMR002', 'Kayah State'),
('Loikaw', 'MMR002001', 'Kayah', 'MMR002', 'Kayah State'),
('Mese', 'MMR002007', 'Kayah', 'MMR002', 'Kayah State'),
('Shadaw', 'MMR002004', 'Kayah', 'MMR002', 'Kayah State'),

-- Kayin State (MMR003) - 7 townships
('Hlaingbwe', 'MMR003002', 'Kayin', 'MMR003', 'Kayin State'),
('Hpa-an', 'MMR003001', 'Kayin', 'MMR003', 'Kayin State'),
('Hpapun', 'MMR003003', 'Kayin', 'MMR003', 'Kayin State'),
('Kawkareik', 'MMR003006', 'Kayin', 'MMR003', 'Kayin State'),
('Kyainseikgyi', 'MMR003007', 'Kayin', 'MMR003', 'Kayin State'),
('Myawaddy', 'MMR003005', 'Kayin', 'MMR003', 'Kayin State'),
('Thandaunggyi', 'MMR003004', 'Kayin', 'MMR003', 'Kayin State'),

-- Chin State (MMR004) - 9 townships
('Falam', 'MMR004001', 'Chin', 'MMR004', 'Chin State'),
('Hakha', 'MMR004002', 'Chin', 'MMR004', 'Chin State'),
('Kanpetlet', 'MMR004008', 'Chin', 'MMR004', 'Chin State'),
('Matupi', 'MMR004007', 'Chin', 'MMR004', 'Chin State'),
('Mindat', 'MMR004006', 'Chin', 'MMR004', 'Chin State'),
('Paletwa', 'MMR004009', 'Chin', 'MMR004', 'Chin State'),
('Tedim', 'MMR004004', 'Chin', 'MMR004', 'Chin State'),
('Thantlang', 'MMR004003', 'Chin', 'MMR004', 'Chin State'),
('Tonzang', 'MMR004005', 'Chin', 'MMR004', 'Chin State'),

-- Sagaing Region (MMR005) - 37 townships
('Ayadaw', 'MMR005014', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Banmauk', 'MMR005023', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Budalin', 'MMR005013', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Chaung-U', 'MMR005015', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Hkamti', 'MMR005033', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Homalin', 'MMR005034', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Indaw', 'MMR005021', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Kale', 'MMR005027', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Kalewa', 'MMR005028', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Kanbalu', 'MMR005007', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Kani', 'MMR005017', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Katha', 'MMR005020', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Kawlin', 'MMR005024', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Khin-U', 'MMR005005', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Kyunhla', 'MMR005008', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Lahe', 'MMR005036', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Leshi', 'MMR005035', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Mawlaik', 'MMR005031', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Mingin', 'MMR005029', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Monywa', 'MMR005012', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Myaung', 'MMR005003', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Myinmu', 'MMR005002', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Nanyun', 'MMR005037', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Pale', 'MMR005019', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Paungbyin', 'MMR005032', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Pinlebu', 'MMR005026', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Sagaing', 'MMR005001', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Salingyi', 'MMR005018', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Shwebo', 'MMR005004', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Tabayin', 'MMR005010', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Tamu', 'MMR005030', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Taze', 'MMR005011', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Tigyaing', 'MMR005022', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Wetlet', 'MMR005006', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Wuntho', 'MMR005025', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Ye-U', 'MMR005009', 'Sagaing', 'MMR005', 'Sagaing Region'),
('Yinmabin', 'MMR005016', 'Sagaing', 'MMR005', 'Sagaing Region'),

-- Tanintharyi Region (MMR006) - 10 townships
('Bokpyin', 'MMR006010', 'Tanintharyi', 'MMR006', 'Tanintharyi Region'),
('Dawei', 'MMR006001', 'Tanintharyi', 'MMR006', 'Tanintharyi Region'),
('Kawthoung', 'MMR006009', 'Tanintharyi', 'MMR006', 'Tanintharyi Region'),
('Kyunsu', 'MMR006006', 'Tanintharyi', 'MMR006', 'Tanintharyi Region'),
('Launglon', 'MMR006002', 'Tanintharyi', 'MMR006', 'Tanintharyi Region'),
('Myeik', 'MMR006005', 'Tanintharyi', 'MMR006', 'Tanintharyi Region'),
('Palaw', 'MMR006007', 'Tanintharyi', 'MMR006', 'Tanintharyi Region'),
('Tanintharyi', 'MMR006008', 'Tanintharyi', 'MMR006', 'Tanintharyi Region'),
('Thayetchaung', 'MMR006003', 'Tanintharyi', 'MMR006', 'Tanintharyi Region'),
('Yebyu', 'MMR006004', 'Tanintharyi', 'MMR006', 'Tanintharyi Region'),

-- Bago Region (MMR007 East, MMR008 West) - 28 townships total
('Bago', 'MMR007001', 'Bago (East)', 'MMR007', 'Bago Region'),
('Daik-U', 'MMR007007', 'Bago (East)', 'MMR007', 'Bago Region'),
('Kawa', 'MMR007003', 'Bago (East)', 'MMR007', 'Bago Region'),
('Kyaukkyi', 'MMR007011', 'Bago (East)', 'MMR007', 'Bago Region'),
('Kyauktaga', 'MMR007006', 'Bago (East)', 'MMR007', 'Bago Region'),
('Nyaunglebin', 'MMR007005', 'Bago (East)', 'MMR007', 'Bago Region'),
('Oktwin', 'MMR007013', 'Bago (East)', 'MMR007', 'Bago Region'),
('Phyu', 'MMR007012', 'Bago (East)', 'MMR007', 'Bago Region'),
('Shwegyin', 'MMR007008', 'Bago (East)', 'MMR007', 'Bago Region'),
('Htantabin', 'MMR007014', 'Bago (East)', 'MMR007', 'Bago Region'),
('Taungoo', 'MMR007009', 'Bago (East)', 'MMR007', 'Bago Region'),
('Thanatpin', 'MMR007002', 'Bago (East)', 'MMR007', 'Bago Region'),
('Waw', 'MMR007004', 'Bago (East)', 'MMR007', 'Bago Region'),
('Yedashe', 'MMR007010', 'Bago (East)', 'MMR007', 'Bago Region'),
('Gyobingauk', 'MMR008014', 'Bago (West)', 'MMR008', 'Bago Region'),
('Letpadan', 'MMR008008', 'Bago (West)', 'MMR008', 'Bago Region'),
('Minhla', 'MMR008009', 'Bago (West)', 'MMR008', 'Bago Region'),
('Monyo', 'MMR008013', 'Bago (West)', 'MMR008', 'Bago Region'),
('Nattalin', 'MMR008012', 'Bago (West)', 'MMR008', 'Bago Region'),
('Okpho', 'MMR008010', 'Bago (West)', 'MMR008', 'Bago Region'),
('Padaung', 'MMR008003', 'Bago (West)', 'MMR008', 'Bago Region'),
('Paukkhaung', 'MMR008002', 'Bago (West)', 'MMR008', 'Bago Region'),
('Paungde', 'MMR008004', 'Bago (West)', 'MMR008', 'Bago Region'),
('Pyay', 'MMR008001', 'Bago (West)', 'MMR008', 'Bago Region'),
('Shwedaung', 'MMR008006', 'Bago (West)', 'MMR008', 'Bago Region'),
('Thegon', 'MMR008005', 'Bago (West)', 'MMR008', 'Bago Region'),
('Zigon', 'MMR008011', 'Bago (West)', 'MMR008', 'Bago Region'),
('Thayarwady', 'MMR008007', 'Bago (West)', 'MMR008', 'Bago Region'),

-- Magway Region (MMR009) - 25 townships
('Aunglan', 'MMR009016', 'Magway', 'MMR009', 'Magway Region'),
('Chauk', 'MMR009003', 'Magway', 'MMR009', 'Magway Region'),
('Gangaw', 'MMR009023', 'Magway', 'MMR009', 'Magway Region'),
('Kamma', 'MMR009015', 'Magway', 'MMR009', 'Magway Region'),
('Magway', 'MMR009001', 'Magway', 'MMR009', 'Magway Region'),
('Minbu', 'MMR009007', 'Magway', 'MMR009', 'Magway Region'),
('Mindon', 'MMR009014', 'Magway', 'MMR009', 'Magway Region'),
('Minhla', 'MMR009013', 'Magway', 'MMR009', 'Magway Region'),
('Myaing', 'MMR009020', 'Magway', 'MMR009', 'Magway Region'),
('Myothit', 'MMR009005', 'Magway', 'MMR009', 'Magway Region'),
('Natmauk', 'MMR009006', 'Magway', 'MMR009', 'Magway Region'),
('Ngape', 'MMR009009', 'Magway', 'MMR009', 'Magway Region'),
('Pakokku', 'MMR009018', 'Magway', 'MMR009', 'Magway Region'),
('Pauk', 'MMR009021', 'Magway', 'MMR009', 'Magway Region'),
('Pwintbyu', 'MMR009008', 'Magway', 'MMR009', 'Magway Region'),
('Salin', 'MMR009010', 'Magway', 'MMR009', 'Magway Region'),
('Saw', 'MMR009025', 'Magway', 'MMR009', 'Magway Region'),
('Seikphyu', 'MMR009022', 'Magway', 'MMR009', 'Magway Region'),
('Sidoktaya', 'MMR009011', 'Magway', 'MMR009', 'Magway Region'),
('Sinbaungwe', 'MMR009017', 'Magway', 'MMR009', 'Magway Region'),
('Taungdwingyi', 'MMR009004', 'Magway', 'MMR009', 'Magway Region'),
('Thayet', 'MMR009012', 'Magway', 'MMR009', 'Magway Region'),
('Tilin', 'MMR009024', 'Magway', 'MMR009', 'Magway Region'),
('Yenangyaung', 'MMR009002', 'Magway', 'MMR009', 'Magway Region'),
('Yesagyo', 'MMR009019', 'Magway', 'MMR009', 'Magway Region'),

-- Mandalay Region (MMR010) - 28 townships
('Amarapura', 'MMR010006', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Aungmyethazan', 'MMR010001', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Chanayethazan', 'MMR010002', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Chanmyathazi', 'MMR010004', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Kyaukpadaung', 'MMR010020', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Kyaukse', 'MMR010013', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Madaya', 'MMR010009', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Mahaaungmye', 'MMR010003', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Mahlaing', 'MMR010029', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Meiktila', 'MMR010028', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Mogoke', 'MMR010011', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Myingyan', 'MMR010017', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Myittha', 'MMR010015', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Natogyi', 'MMR010019', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Ngazun', 'MMR010021', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Nyaung-U', 'MMR010022', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Patheingyi', 'MMR010007', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Pyawbwe', 'MMR010024', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Pyigyidagun', 'MMR010005', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Pyinoolwin', 'MMR010008', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Singu', 'MMR010010', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Sintgaing', 'MMR010014', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Tada-U', 'MMR010016', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Taungtha', 'MMR010018', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Thabeikkyin', 'MMR010012', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Thazi', 'MMR010030', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Wundwin', 'MMR010031', 'Mandalay', 'MMR010', 'Mandalay Region'),
('Yamethin', 'MMR010023', 'Mandalay', 'MMR010', 'Mandalay Region'),

-- Mon State (MMR011) - 10 townships
('Bilin', 'MMR011010', 'Mon', 'MMR011', 'Mon State'),
('Chaungzon', 'MMR011003', 'Mon', 'MMR011', 'Mon State'),
('Kyaikmaraw', 'MMR011002', 'Mon', 'MMR011', 'Mon State'),
('Kyaikto', 'MMR011009', 'Mon', 'MMR011', 'Mon State'),
('Mawlamyine', 'MMR011001', 'Mon', 'MMR011', 'Mon State'),
('Mudon', 'MMR011005', 'Mon', 'MMR011', 'Mon State'),
('Paung', 'MMR011008', 'Mon', 'MMR011', 'Mon State'),
('Thanbyuzayat', 'MMR011004', 'Mon', 'MMR011', 'Mon State'),
('Thaton', 'MMR011007', 'Mon', 'MMR011', 'Mon State'),
('Ye', 'MMR011006', 'Mon', 'MMR011', 'Mon State'),

-- Rakhine State (MMR012) - 17 townships
('Ann', 'MMR012014', 'Rakhine', 'MMR012', 'Rakhine State'),
('Buthidaung', 'MMR012010', 'Rakhine', 'MMR012', 'Rakhine State'),
('Gwa', 'MMR012017', 'Rakhine', 'MMR012', 'Rakhine State'),
('Kyaukpyu', 'MMR012011', 'Rakhine', 'MMR012', 'Rakhine State'),
('Kyauktaw', 'MMR012004', 'Rakhine', 'MMR012', 'Rakhine State'),
('Maungdaw', 'MMR012009', 'Rakhine', 'MMR012', 'Rakhine State'),
('Minbya', 'MMR012005', 'Rakhine', 'MMR012', 'Rakhine State'),
('Mrauk-U', 'MMR012003', 'Rakhine', 'MMR012', 'Rakhine State'),
('Myebon', 'MMR012006', 'Rakhine', 'MMR012', 'Rakhine State'),
('Pauktaw', 'MMR012007', 'Rakhine', 'MMR012', 'Rakhine State'),
('Ponnagyun', 'MMR012002', 'Rakhine', 'MMR012', 'Rakhine State'),
('Ramree', 'MMR012013', 'Rakhine', 'MMR012', 'Rakhine State'),
('Rathedaung', 'MMR012008', 'Rakhine', 'MMR012', 'Rakhine State'),
('Sittwe', 'MMR012001', 'Rakhine', 'MMR012', 'Rakhine State'),
('Thandwe', 'MMR012015', 'Rakhine', 'MMR012', 'Rakhine State'),
('Toungup', 'MMR012016', 'Rakhine', 'MMR012', 'Rakhine State'),
('MraukU', 'MMR012012', 'Rakhine', 'MMR012', 'Rakhine State'),

-- Yangon Region (MMR013) - 45 townships
('Botahtaung', 'MMR013017', 'Yangon', 'MMR013', 'Yangon Region'),
('Cocokyun', 'MMR013032', 'Yangon', 'MMR013', 'Yangon Region'),
('Dagon', 'MMR013043', 'Yangon', 'MMR013', 'Yangon Region'),
('Dagon Seikkan', 'MMR013021', 'Yangon', 'MMR013', 'Yangon Region'),
('Dala', 'MMR013030', 'Yangon', 'MMR013', 'Yangon Region'),
('Dawbon', 'MMR013014', 'Yangon', 'MMR013', 'Yangon Region'),
('East Dagon', 'MMR013020', 'Yangon', 'MMR013', 'Yangon Region'),
('Hlaing', 'MMR013040', 'Yangon', 'MMR013', 'Yangon Region'),
('Hlaingthaya', 'MMR013046', 'Yangon', 'MMR013', 'Yangon Region'),
('Hlegu', 'MMR013004', 'Yangon', 'MMR013', 'Yangon Region'),
('Hmawbi', 'MMR013003', 'Yangon', 'MMR013', 'Yangon Region'),
('Htantabin', 'MMR013006', 'Yangon', 'MMR013', 'Yangon Region'),
('Insein', 'MMR013001', 'Yangon', 'MMR013', 'Yangon Region'),
('Kamayut', 'MMR013041', 'Yangon', 'MMR013', 'Yangon Region'),
('Kawhmu', 'MMR013028', 'Yangon', 'MMR013', 'Yangon Region'),
('Kayan', 'MMR013026', 'Yangon', 'MMR013', 'Yangon Region'),
('Kungyangon', 'MMR013029', 'Yangon', 'MMR013', 'Yangon Region'),
('Kyauktan', 'MMR013024', 'Yangon', 'MMR013', 'Yangon Region'),
('Kyimyindaing', 'MMR013038', 'Yangon', 'MMR013', 'Yangon Region'),
('Lanmadaw', 'MMR013035', 'Yangon', 'MMR013', 'Yangon Region'),
('Latha', 'MMR013036', 'Yangon', 'MMR013', 'Yangon Region'),
('Mayangon', 'MMR013042', 'Yangon', 'MMR013', 'Yangon Region'),
('Mingaladon', 'MMR013002', 'Yangon', 'MMR013', 'Yangon Region'),
('Mingalartaungnyunt', 'MMR013022', 'Yangon', 'MMR013', 'Yangon Region'),
('North Dagon', 'MMR013019', 'Yangon', 'MMR013', 'Yangon Region'),
('North Okkalapa', 'MMR013012', 'Yangon', 'MMR013', 'Yangon Region'),
('Pabedan', 'MMR013034', 'Yangon', 'MMR013', 'Yangon Region'),
('Pazundaung', 'MMR013016', 'Yangon', 'MMR013', 'Yangon Region'),
('Sanchaung', 'MMR013039', 'Yangon', 'MMR013', 'Yangon Region'),
('Seikgyikanaungto', 'MMR013031', 'Yangon', 'MMR013', 'Yangon Region'),
('Shwepyithar', 'MMR013007', 'Yangon', 'MMR013', 'Yangon Region'),
('South Dagon', 'MMR013018', 'Yangon', 'MMR013', 'Yangon Region'),
('South Okkalapa', 'MMR013011', 'Yangon', 'MMR013', 'Yangon Region'),
('Taikkyi', 'MMR013005', 'Yangon', 'MMR013', 'Yangon Region'),
('Tamwe', 'MMR013015', 'Yangon', 'MMR013', 'Yangon Region'),
('Thaketa', 'MMR013013', 'Yangon', 'MMR013', 'Yangon Region'),
('Thanlyin', 'MMR013023', 'Yangon', 'MMR013', 'Yangon Region'),
('Thingangyun', 'MMR013009', 'Yangon', 'MMR013', 'Yangon Region'),
('Thongwa', 'MMR013025', 'Yangon', 'MMR013', 'Yangon Region'),
('Twantay', 'MMR013027', 'Yangon', 'MMR013', 'Yangon Region'),
('Yankin', 'MMR013010', 'Yangon', 'MMR013', 'Yangon Region'),

-- Shan State (MMR014 South, MMR015 North, MMR016 East) - 55 townships total
('Hopong', 'MMR014003', 'Shan (South)', 'MMR014', 'Shan State'),
('Hsihseng', 'MMR014004', 'Shan (South)', 'MMR014', 'Shan State'),
('Kalaw', 'MMR014005', 'Shan (South)', 'MMR014', 'Shan State'),
('Kunhing', 'MMR014014', 'Shan (South)', 'MMR014', 'Shan State'),
('Kyethi', 'MMR014015', 'Shan (South)', 'MMR014', 'Shan State'),
('Laihka', 'MMR014012', 'Shan (South)', 'MMR014', 'Shan State'),
('Langkho', 'MMR014018', 'Shan (South)', 'MMR014', 'Shan State'),
('Lawksawk', 'MMR014008', 'Shan (South)', 'MMR014', 'Shan State'),
('Loilen', 'MMR014011', 'Shan (South)', 'MMR014', 'Shan State'),
('Maukmai', 'MMR014020', 'Shan (South)', 'MMR014', 'Shan State'),
('Mongkaung', 'MMR014016', 'Shan (South)', 'MMR014', 'Shan State'),
('Mongnai', 'MMR014019', 'Shan (South)', 'MMR014', 'Shan State'),
('Mongpan', 'MMR014021', 'Shan (South)', 'MMR014', 'Shan State'),
('Nansang', 'MMR014013', 'Shan (South)', 'MMR014', 'Shan State'),
('Nyaungshwe', 'MMR014002', 'Shan (South)', 'MMR014', 'Shan State'),
('Pekon', 'MMR014010', 'Shan (South)', 'MMR014', 'Shan State'),
('Pindaya', 'MMR014006', 'Shan (South)', 'MMR014', 'Shan State'),
('Pinlaung', 'MMR014009', 'Shan (South)', 'MMR014', 'Shan State'),
('Taunggyi', 'MMR014001', 'Shan (South)', 'MMR014', 'Shan State'),
('Ywangan', 'MMR014007', 'Shan (South)', 'MMR014', 'Shan State'),
('Mongton', 'MMR014017', 'Shan (South)', 'MMR014', 'Shan State'),
('Hopang', 'MMR015021', 'Shan (North)', 'MMR015', 'Shan State'),
('Hseni', 'MMR015002', 'Shan (North)', 'MMR015', 'Shan State'),
('Hsipaw', 'MMR015014', 'Shan (North)', 'MMR015', 'Shan State'),
('Konkyan', 'MMR015023', 'Shan (North)', 'MMR015', 'Shan State'),
('Kunlong', 'MMR015020', 'Shan (North)', 'MMR015', 'Shan State'),
('Kutkai', 'MMR015011', 'Shan (North)', 'MMR015', 'Shan State'),
('Kyaukme', 'MMR015012', 'Shan (North)', 'MMR015', 'Shan State'),
('Lashio', 'MMR015001', 'Shan (North)', 'MMR015', 'Shan State'),
('Laukkaing', 'MMR015022', 'Shan (North)', 'MMR015', 'Shan State'),
('Mabein', 'MMR015018', 'Shan (North)', 'MMR015', 'Shan State'),
('Mantong', 'MMR015019', 'Shan (North)', 'MMR015', 'Shan State'),
('Matman', 'MMR015024', 'Shan (North)', 'MMR015', 'Shan State'),
('Mongmao', 'MMR015008', 'Shan (North)', 'MMR015', 'Shan State'),
('Mongmit', 'MMR015017', 'Shan (North)', 'MMR015', 'Shan State'),
('Mongyai', 'MMR015003', 'Shan (North)', 'MMR015', 'Shan State'),
('Muse', 'MMR015009', 'Shan (North)', 'MMR015', 'Shan State'),
('Namhkan', 'MMR015010', 'Shan (North)', 'MMR015', 'Shan State'),
('Namhsan', 'MMR015016', 'Shan (North)', 'MMR015', 'Shan State'),
('Namtu', 'MMR015015', 'Shan (North)', 'MMR015', 'Shan State'),
('Narphan', 'MMR015006', 'Shan (North)', 'MMR015', 'Shan State'),
('Nawnghkio', 'MMR015013', 'Shan (North)', 'MMR015', 'Shan State'),
('Pangwaun', 'MMR015007', 'Shan (North)', 'MMR015', 'Shan State'),
('Pangsang', 'MMR015005', 'Shan (North)', 'MMR015', 'Shan State'),
('Tangyan', 'MMR015004', 'Shan (North)', 'MMR015', 'Shan State'),
('Kengtung', 'MMR016001', 'Shan (East)', 'MMR016', 'Shan State'),
('Monghpyak', 'MMR016010', 'Shan (East)', 'MMR016', 'Shan State'),
('Monghsat', 'MMR016006', 'Shan (East)', 'MMR016', 'Shan State'),
('Mongkhet', 'MMR016002', 'Shan (East)', 'MMR016', 'Shan State'),
('Mongla', 'MMR016005', 'Shan (East)', 'MMR016', 'Shan State'),
('Mongping', 'MMR016007', 'Shan (East)', 'MMR016', 'Shan State'),
('Mongton', 'MMR016008', 'Shan (East)', 'MMR016', 'Shan State'),
('Mongyang', 'MMR016003', 'Shan (East)', 'MMR016', 'Shan State'),
('Mongyawng', 'MMR016011', 'Shan (East)', 'MMR016', 'Shan State'),
('Tachileik', 'MMR016009', 'Shan (East)', 'MMR016', 'Shan State'),

-- Ayeyarwady Region (MMR017) - 26 townships
('Bogale', 'MMR017024', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Danubyu', 'MMR017022', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Dedaye', 'MMR017026', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Einme', 'MMR017015', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Hinthada', 'MMR017008', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Ingapu', 'MMR017013', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Kangyidaunt', 'MMR017002', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Kyangin', 'MMR017012', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Kyaiklat', 'MMR017025', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Kyaunggon', 'MMR017007', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Kyonpyaw', 'MMR017005', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Labutta', 'MMR017016', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Lemyethna', 'MMR017010', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Maubin', 'MMR017019', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Mawlamyinegyun', 'MMR017018', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Myanaung', 'MMR017011', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Myaungmya', 'MMR017014', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Ngapudaw', 'MMR017004', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Nyaungdon', 'MMR017021', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Pantanaw', 'MMR017020', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Pathein', 'MMR017001', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Pyapon', 'MMR017023', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Thabaung', 'MMR017003', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Wakema', 'MMR017017', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Yegyi', 'MMR017006', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),
('Zalun', 'MMR017009', 'Ayeyarwady', 'MMR017', 'Ayeyarwady Region'),

-- Naypyidaw Union Territory (MMR018) - 8 townships
('Dekkhinathiri', 'MMR018004', 'Naypyidaw', 'MMR018', 'Naypyidaw Union Territory'),
('Lewe', 'MMR018007', 'Naypyidaw', 'MMR018', 'Naypyidaw Union Territory'),
('Ottarathiri', 'MMR018008', 'Naypyidaw', 'MMR018', 'Naypyidaw Union Territory'),
('Pobbathiri', 'MMR018005', 'Naypyidaw', 'MMR018', 'Naypyidaw Union Territory'),
('Pyinmana', 'MMR018006', 'Naypyidaw', 'MMR018', 'Naypyidaw Union Territory'),
('Tatkon', 'MMR018003', 'Naypyidaw', 'MMR018', 'Naypyidaw Union Territory'),
('Zabuthiri', 'MMR018002', 'Naypyidaw', 'MMR018', 'Naypyidaw Union Territory'),
('Zeyathiri', 'MMR018001', 'Naypyidaw', 'MMR018', 'Naypyidaw Union Territory');

-- Create index for faster joins
CREATE INDEX idx_tmp_township_region ON tmp_township_mapping(region_name);

-- Count townships per region
SELECT 'Townships per region:' as info;
SELECT region_name, COUNT(*) as township_count
FROM tmp_township_mapping
GROUP BY region_name
ORDER BY region_name;

-- ============================================================================
-- STEP 2: Identify region-level breakdowns to distribute
-- ============================================================================

DROP TABLE IF EXISTS tmp_region_breakdowns;
CREATE TEMP TABLE tmp_region_breakdowns AS
SELECT
  sb.id,
  sb.activity_id,
  sb.region_name,
  sb.percentage,
  sb.st_pcode
FROM subnational_breakdowns sb
WHERE (sb.allocation_level = 'region' OR sb.allocation_level IS NULL)
  AND sb.is_nationwide = false
  AND EXISTS (
    SELECT 1 FROM tmp_township_mapping tm WHERE tm.region_name = sb.region_name
  );

SELECT 'Region-level breakdowns to distribute: ' || COUNT(*)::TEXT as info
FROM tmp_region_breakdowns;

-- ============================================================================
-- STEP 3: Calculate township counts per region for percentage distribution
-- ============================================================================

DROP TABLE IF EXISTS tmp_region_township_counts;
CREATE TEMP TABLE tmp_region_township_counts AS
SELECT
  region_name,
  COUNT(*) as township_count
FROM tmp_township_mapping
GROUP BY region_name;

-- ============================================================================
-- STEP 4: Delete existing region-level breakdowns (will be replaced)
-- ============================================================================

DELETE FROM subnational_breakdowns
WHERE id IN (SELECT id FROM tmp_region_breakdowns);

SELECT 'Deleted region-level breakdowns: ' || COUNT(*)::TEXT as info
FROM tmp_region_breakdowns;

-- ============================================================================
-- STEP 5: Insert township-level breakdowns
-- ============================================================================
-- Distribute each region's percentage equally across its townships

WITH expanded_townships AS (
  SELECT
    rb.activity_id,
    tm.st_name || ' - ' || tm.ts_name as region_name,
    tm.ts_pcode,
    tm.st_pcode,
    rb.percentage,
    rtc.township_count,
    ROW_NUMBER() OVER (PARTITION BY rb.activity_id, rb.region_name ORDER BY tm.ts_name) as rn
  FROM tmp_region_breakdowns rb
  JOIN tmp_township_mapping tm ON tm.region_name = rb.region_name
  JOIN tmp_region_township_counts rtc ON rtc.region_name = rb.region_name
),
breakdown_data AS (
  SELECT
    activity_id,
    region_name,
    ts_pcode,
    st_pcode,
    township_count,
    CASE
      WHEN rn = 1 THEN
        -- First township gets remainder to ensure sum = original percentage
        ROUND(percentage - (FLOOR(percentage * 100.0 / township_count) / 100.0 * (township_count - 1)), 2)
      ELSE
        ROUND(FLOOR(percentage * 100.0 / township_count) / 100.0, 2)
    END as percentage
  FROM expanded_townships
)
INSERT INTO subnational_breakdowns (
  activity_id,
  region_name,
  percentage,
  is_nationwide,
  allocation_level,
  st_pcode,
  ts_pcode,
  created_at,
  updated_at
)
SELECT
  activity_id,
  region_name,
  percentage,
  false,
  'township',
  st_pcode,
  ts_pcode,
  NOW(),
  NOW()
FROM breakdown_data
WHERE percentage > 0;

-- ============================================================================
-- STEP 6: Verification
-- ============================================================================

SELECT 'Final breakdown counts by level:' as info;
SELECT
  COALESCE(allocation_level, 'NULL') as level,
  COUNT(*) as count
FROM subnational_breakdowns
GROUP BY allocation_level;

-- Check that percentages still sum to 100% per activity
SELECT 'Activities with percentage totals (should all be ~100%):' as info;
SELECT
  a.title_narrative,
  COUNT(*) as breakdown_count,
  ROUND(SUM(sb.percentage), 2) as total_percentage
FROM subnational_breakdowns sb
JOIN activities a ON a.id = sb.activity_id
GROUP BY a.title_narrative
ORDER BY a.title_narrative;

-- Sample of new township breakdowns
SELECT 'Sample township breakdowns:' as info;
SELECT
  a.title_narrative,
  sb.region_name,
  sb.percentage,
  sb.allocation_level,
  sb.ts_pcode
FROM subnational_breakdowns sb
JOIN activities a ON a.id = sb.activity_id
WHERE sb.allocation_level = 'township'
ORDER BY a.title_narrative, sb.region_name
LIMIT 30;

-- Cleanup
DROP TABLE IF EXISTS tmp_township_mapping;
DROP TABLE IF EXISTS tmp_region_breakdowns;
DROP TABLE IF EXISTS tmp_region_township_counts;
