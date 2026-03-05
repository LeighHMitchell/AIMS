-- Seed Myanmar Line Ministries (administrative budget classifications)
-- Government of Myanmar structure as of July 2025 (Nyo Saw cabinet)
-- ====================================================================

-- Clear existing administrative classifications to replace with full structure
DELETE FROM budget_classifications WHERE classification_type = 'administrative';

-- ============================================================
-- Level 1: Ministries and top-level bodies
-- ============================================================

INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active) VALUES
  ('ADM-01', 'Office of the Prime Minister', 'administrative', 1, 10, true),
  ('ADM-02', 'Ministry of Defence', 'administrative', 1, 20, true),
  ('ADM-03', 'Ministry of Home Affairs', 'administrative', 1, 30, true),
  ('ADM-04', 'Ministry of Border Affairs and Ethnic Affairs', 'administrative', 1, 40, true),
  ('ADM-05', 'Ministry of Foreign Affairs', 'administrative', 1, 50, true),
  ('ADM-06', 'Ministry of National Planning', 'administrative', 1, 60, true),
  ('ADM-07', 'Ministry of Finance and Revenue', 'administrative', 1, 70, true),
  ('ADM-08', 'Ministry of Investment and Foreign Economic Relations', 'administrative', 1, 80, true),
  ('ADM-09', 'Ministry of Transport and Communications', 'administrative', 1, 90, true),
  ('ADM-10', 'Ministry of Information', 'administrative', 1, 100, true),
  ('ADM-11', 'Ministry of Legal Affairs', 'administrative', 1, 110, true),
  ('ADM-12', 'Ministry of Religious Affairs and Culture', 'administrative', 1, 120, true),
  ('ADM-13', 'Ministry of Agriculture, Livestock and Irrigation', 'administrative', 1, 130, true),
  ('ADM-14', 'Ministry of Cooperatives and Rural Development', 'administrative', 1, 140, true),
  ('ADM-15', 'Ministry of Natural Resources and Environmental Conservation', 'administrative', 1, 150, true),
  ('ADM-16', 'Ministry of Electric Power', 'administrative', 1, 160, true),
  ('ADM-17', 'Ministry of Energy', 'administrative', 1, 170, true),
  ('ADM-18', 'Ministry of Industry', 'administrative', 1, 180, true),
  ('ADM-19', 'Ministry of Immigration and Population', 'administrative', 1, 190, true),
  ('ADM-20', 'Ministry of Labour', 'administrative', 1, 200, true),
  ('ADM-21', 'Ministry of Commerce', 'administrative', 1, 210, true),
  ('ADM-22', 'Ministry of Education', 'administrative', 1, 220, true),
  ('ADM-23', 'Ministry of Science and Technology', 'administrative', 1, 230, true),
  ('ADM-24', 'Ministry of Health', 'administrative', 1, 240, true),
  ('ADM-25', 'Ministry of Sports and Youth Affairs', 'administrative', 1, 250, true),
  ('ADM-26', 'Ministry of Hotels and Tourism', 'administrative', 1, 260, true),
  ('ADM-27', 'Ministry of Construction', 'administrative', 1, 270, true),
  ('ADM-28', 'Ministry of Social Welfare, Relief and Resettlement', 'administrative', 1, 280, true),
  ('ADM-90', 'Nay Pyi Taw Council', 'administrative', 1, 900, true),
  ('ADM-91', 'Union Attorney General''s Office', 'administrative', 1, 910, true),
  ('ADM-92', 'Union Auditor General''s Office', 'administrative', 1, 920, true),
  ('ADM-93', 'Central Bank of Myanmar', 'administrative', 1, 930, true);

-- ============================================================
-- Level 2: Departments and agencies under each ministry
-- ============================================================

-- Ministry of Home Affairs (ADM-03)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-03-01', 'Myanmar Police Force', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-03' AND classification_type = 'administrative')),
  ('ADM-03-02', 'General Administration Department', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-03' AND classification_type = 'administrative')),
  ('ADM-03-03', 'Special Investigation Department', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-03' AND classification_type = 'administrative')),
  ('ADM-03-04', 'Prison Department', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-03' AND classification_type = 'administrative')),
  ('ADM-03-05', 'Fire Department', 'administrative', 2, 50, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-03' AND classification_type = 'administrative'));

-- Ministry of Border Affairs and Ethnic Affairs (ADM-04)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-04-01', 'Progress of Border Areas and National Races Department', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-04' AND classification_type = 'administrative')),
  ('ADM-04-02', 'Education and Training Department', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-04' AND classification_type = 'administrative')),
  ('ADM-04-03', 'Department of Ethnical Literature and Culture', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-04' AND classification_type = 'administrative')),
  ('ADM-04-04', 'Department of Ethnic Rights', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-04' AND classification_type = 'administrative'));

-- Ministry of Foreign Affairs (ADM-05)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-05-01', 'Political Affairs Department', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-05' AND classification_type = 'administrative')),
  ('ADM-05-02', 'ASEAN Affairs Department', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-05' AND classification_type = 'administrative')),
  ('ADM-05-03', 'Strategy and Training Department', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-05' AND classification_type = 'administrative')),
  ('ADM-05-04', 'International Organizations and Economic Affairs Department', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-05' AND classification_type = 'administrative'));

-- Ministry of National Planning (ADM-06)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-06-01', 'Planning Department', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-06' AND classification_type = 'administrative')),
  ('ADM-06-02', 'Project Appraisal and Progress Reporting Department', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-06' AND classification_type = 'administrative')),
  ('ADM-06-03', 'Central Statistical Organization', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-06' AND classification_type = 'administrative')),
  ('ADM-06-04', 'National Archives Department', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-06' AND classification_type = 'administrative'));

-- Ministry of Finance and Revenue (ADM-07)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-07-01', 'Budget Department', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-07' AND classification_type = 'administrative')),
  ('ADM-07-02', 'Treasury Department', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-07' AND classification_type = 'administrative')),
  ('ADM-07-03', 'Internal Revenue Department', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-07' AND classification_type = 'administrative')),
  ('ADM-07-04', 'Customs Department', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-07' AND classification_type = 'administrative')),
  ('ADM-07-05', 'Financial Regulatory Department', 'administrative', 2, 50, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-07' AND classification_type = 'administrative')),
  ('ADM-07-06', 'Pension Department', 'administrative', 2, 60, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-07' AND classification_type = 'administrative')),
  ('ADM-07-07', 'Myanma Economic Bank', 'administrative', 2, 70, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-07' AND classification_type = 'administrative')),
  ('ADM-07-08', 'Myanma Insurance', 'administrative', 2, 80, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-07' AND classification_type = 'administrative'));

-- Ministry of Investment and Foreign Economic Relations (ADM-08)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-08-01', 'Directorate of Investment and Company Administration', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-08' AND classification_type = 'administrative')),
  ('ADM-08-02', 'Foreign Economic Relations Department', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-08' AND classification_type = 'administrative'));

-- Ministry of Transport and Communications (ADM-09)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-09-01', 'Directorate of Civil Aviation', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-09' AND classification_type = 'administrative')),
  ('ADM-09-02', 'Directorate of Marine Transportation', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-09' AND classification_type = 'administrative')),
  ('ADM-09-03', 'Directorate of Water Resources and River Development', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-09' AND classification_type = 'administrative')),
  ('ADM-09-04', 'Directorate of Meteorology and Hydrology', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-09' AND classification_type = 'administrative')),
  ('ADM-09-05', 'Directorate of Communications', 'administrative', 2, 50, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-09' AND classification_type = 'administrative')),
  ('ADM-09-06', 'Myanmar Railways', 'administrative', 2, 60, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-09' AND classification_type = 'administrative')),
  ('ADM-09-07', 'Inland Water Transport', 'administrative', 2, 70, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-09' AND classification_type = 'administrative')),
  ('ADM-09-08', 'Myanmar Ports Authority', 'administrative', 2, 80, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-09' AND classification_type = 'administrative'));

-- Ministry of Information (ADM-10)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-10-01', 'Myanma Radio and Television', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-10' AND classification_type = 'administrative')),
  ('ADM-10-02', 'Information and Public Relations Department', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-10' AND classification_type = 'administrative')),
  ('ADM-10-03', 'Printing and Publishing Department', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-10' AND classification_type = 'administrative')),
  ('ADM-10-04', 'News and Periodicals Enterprise', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-10' AND classification_type = 'administrative'));

-- Ministry of Legal Affairs (ADM-11)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-11-01', 'Legislative Vetting Department', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-11' AND classification_type = 'administrative')),
  ('ADM-11-02', 'Legal Advice Department', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-11' AND classification_type = 'administrative')),
  ('ADM-11-03', 'Prosecution Department', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-11' AND classification_type = 'administrative'));

-- Ministry of Religious Affairs and Culture (ADM-12)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-12-01', 'Religious Affairs Bureau', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-12' AND classification_type = 'administrative')),
  ('ADM-12-02', 'Arts Bureau', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-12' AND classification_type = 'administrative')),
  ('ADM-12-03', 'Historical Research and National Library Bureau', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-12' AND classification_type = 'administrative')),
  ('ADM-12-04', 'Archaeological Research and National Museum Bureau', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-12' AND classification_type = 'administrative'));

-- Ministry of Agriculture, Livestock and Irrigation (ADM-13)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-13-01', 'Department of Agriculture', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-13' AND classification_type = 'administrative')),
  ('ADM-13-02', 'Department of Agricultural Land Management and Statistics', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-13' AND classification_type = 'administrative')),
  ('ADM-13-03', 'Department of Irrigation and Water Utilization Management', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-13' AND classification_type = 'administrative')),
  ('ADM-13-04', 'Department of Agricultural Mechanization', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-13' AND classification_type = 'administrative')),
  ('ADM-13-05', 'Department of Agricultural Research', 'administrative', 2, 50, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-13' AND classification_type = 'administrative')),
  ('ADM-13-06', 'Livestock Breeding and Veterinary Department', 'administrative', 2, 60, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-13' AND classification_type = 'administrative')),
  ('ADM-13-07', 'Department of Fisheries', 'administrative', 2, 70, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-13' AND classification_type = 'administrative')),
  ('ADM-13-08', 'Department of Rural Development', 'administrative', 2, 80, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-13' AND classification_type = 'administrative'));

-- Ministry of Cooperatives and Rural Development (ADM-14)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-14-01', 'Cooperative Department', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-14' AND classification_type = 'administrative')),
  ('ADM-14-02', 'Rural Development Department', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-14' AND classification_type = 'administrative')),
  ('ADM-14-03', 'Small and Medium Enterprise Department', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-14' AND classification_type = 'administrative'));

-- Ministry of Natural Resources and Environmental Conservation (ADM-15)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-15-01', 'Forest Department', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-15' AND classification_type = 'administrative')),
  ('ADM-15-02', 'Dry Zone Greening Department', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-15' AND classification_type = 'administrative')),
  ('ADM-15-03', 'Environmental Conservation Department', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-15' AND classification_type = 'administrative')),
  ('ADM-15-04', 'Department of Geological Survey and Mineral Exploration', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-15' AND classification_type = 'administrative')),
  ('ADM-15-05', 'Myanma Gems Enterprise', 'administrative', 2, 50, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-15' AND classification_type = 'administrative')),
  ('ADM-15-06', 'Myanma Timber Enterprise', 'administrative', 2, 60, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-15' AND classification_type = 'administrative'));

-- Ministry of Electric Power (ADM-16)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-16-01', 'Department of Electric Power and Planning', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-16' AND classification_type = 'administrative')),
  ('ADM-16-02', 'Department of Power Transmission and System Control', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-16' AND classification_type = 'administrative')),
  ('ADM-16-03', 'Department of Hydropower Implementation', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-16' AND classification_type = 'administrative')),
  ('ADM-16-04', 'Electric Power Generation Enterprise', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-16' AND classification_type = 'administrative')),
  ('ADM-16-05', 'Electricity Supply Enterprise', 'administrative', 2, 50, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-16' AND classification_type = 'administrative')),
  ('ADM-16-06', 'Yangon Electricity Supply Corporation', 'administrative', 2, 60, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-16' AND classification_type = 'administrative')),
  ('ADM-16-07', 'Mandalay Electricity Supply Corporation', 'administrative', 2, 70, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-16' AND classification_type = 'administrative'));

-- Ministry of Energy (ADM-17)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-17-01', 'Oil and Gas Management Department', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-17' AND classification_type = 'administrative')),
  ('ADM-17-02', 'Petroleum Product Inspection Department', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-17' AND classification_type = 'administrative')),
  ('ADM-17-03', 'Myanma Oil and Gas Enterprise', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-17' AND classification_type = 'administrative')),
  ('ADM-17-04', 'Myanma Petrochemical Enterprise', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-17' AND classification_type = 'administrative'));

-- Ministry of Industry (ADM-18)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-18-01', 'Directorate of Industrial Collaboration', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-18' AND classification_type = 'administrative')),
  ('ADM-18-02', 'Directorate of Industrial Supervision and Inspection', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-18' AND classification_type = 'administrative')),
  ('ADM-18-03', 'Myanma Pharmaceutical Industrial Enterprise', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-18' AND classification_type = 'administrative'));

-- Ministry of Immigration and Population (ADM-19)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-19-01', 'Department of Immigration and National Registration', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-19' AND classification_type = 'administrative')),
  ('ADM-19-02', 'Department of Population', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-19' AND classification_type = 'administrative'));

-- Ministry of Labour (ADM-20)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-20-01', 'Department of Labour', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-20' AND classification_type = 'administrative')),
  ('ADM-20-02', 'Factories and General Labour Laws Inspection Department', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-20' AND classification_type = 'administrative')),
  ('ADM-20-03', 'Social Security Board', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-20' AND classification_type = 'administrative'));

-- Ministry of Commerce (ADM-21)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-21-01', 'Department of Trade', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-21' AND classification_type = 'administrative')),
  ('ADM-21-02', 'Department of Border Trade', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-21' AND classification_type = 'administrative')),
  ('ADM-21-03', 'Department of Consumer Affairs', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-21' AND classification_type = 'administrative')),
  ('ADM-21-04', 'Myanmar Trade Promotion Organization', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-21' AND classification_type = 'administrative'));

-- Ministry of Education (ADM-22)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-22-01', 'Department of Basic Education', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-22' AND classification_type = 'administrative')),
  ('ADM-22-02', 'Department of Higher Education', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-22' AND classification_type = 'administrative')),
  ('ADM-22-03', 'Department of Technical, Agricultural and Vocational Education', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-22' AND classification_type = 'administrative')),
  ('ADM-22-04', 'Myanmar Examination Board', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-22' AND classification_type = 'administrative')),
  ('ADM-22-05', 'Myanmar Education Research Bureau', 'administrative', 2, 50, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-22' AND classification_type = 'administrative'));

-- Ministry of Science and Technology (ADM-23)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-23-01', 'Department of Advanced Science and Technology', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-23' AND classification_type = 'administrative')),
  ('ADM-23-02', 'Department of Technical and Vocational Education and Training', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-23' AND classification_type = 'administrative')),
  ('ADM-23-03', 'Department of Research and Innovation', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-23' AND classification_type = 'administrative')),
  ('ADM-23-04', 'Department of Atomic Energy', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-23' AND classification_type = 'administrative'));

-- Ministry of Health (ADM-24)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-24-01', 'Department of Public Health', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-24' AND classification_type = 'administrative')),
  ('ADM-24-02', 'Department of Medical Services', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-24' AND classification_type = 'administrative')),
  ('ADM-24-03', 'Department of Human Resources for Health', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-24' AND classification_type = 'administrative')),
  ('ADM-24-04', 'Department of Medical Research', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-24' AND classification_type = 'administrative')),
  ('ADM-24-05', 'Department of Food and Drug Administration', 'administrative', 2, 50, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-24' AND classification_type = 'administrative')),
  ('ADM-24-06', 'Department of Traditional Medicine', 'administrative', 2, 60, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-24' AND classification_type = 'administrative'));

-- Ministry of Sports and Youth Affairs (ADM-25)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-25-01', 'Department of Sports and Physical Education', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-25' AND classification_type = 'administrative')),
  ('ADM-25-02', 'Department of Youth Affairs', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-25' AND classification_type = 'administrative'));

-- Ministry of Hotels and Tourism (ADM-26)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-26-01', 'Directorate of Hotels and Tourism', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-26' AND classification_type = 'administrative'));

-- Ministry of Construction (ADM-27)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-27-01', 'Department of Buildings', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-27' AND classification_type = 'administrative')),
  ('ADM-27-02', 'Department of Highways', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-27' AND classification_type = 'administrative')),
  ('ADM-27-03', 'Department of Bridges', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-27' AND classification_type = 'administrative')),
  ('ADM-27-04', 'Department of Urban and Housing Development', 'administrative', 2, 40, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-27' AND classification_type = 'administrative')),
  ('ADM-27-05', 'Department of Rural Road Development', 'administrative', 2, 50, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-27' AND classification_type = 'administrative'));

-- Ministry of Social Welfare, Relief and Resettlement (ADM-28)
INSERT INTO budget_classifications (code, name, classification_type, level, sort_order, is_active, parent_id) VALUES
  ('ADM-28-01', 'Department of Social Welfare', 'administrative', 2, 10, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-28' AND classification_type = 'administrative')),
  ('ADM-28-02', 'Disaster Management Department', 'administrative', 2, 20, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-28' AND classification_type = 'administrative')),
  ('ADM-28-03', 'Department of Rehabilitation', 'administrative', 2, 30, true, (SELECT id FROM budget_classifications WHERE code = 'ADM-28' AND classification_type = 'administrative'));
