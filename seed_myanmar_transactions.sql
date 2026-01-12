-- ============================================================================
-- SEED DATA: Transactions for 10 Myanmar Development Activities
-- ============================================================================
-- This script creates realistic transactions for each activity including:
-- - Disbursements (type '3'): Funds released to implementers
-- - Expenditures (type '4'): Actual spending recorded
-- - Incoming Funds (type '1'): For co-financed projects
--
-- NOTE: Large commitment transactions are excluded to avoid integer overflow
-- in the transaction_sector_lines trigger. Program commitments are tracked
-- via the activity_budgets table instead.
-- ============================================================================

-- Activity 1: Rural Primary School Construction Program (RPSCTP)
-- Total budget: ~$45M | Disbursed to date: ~$22M
INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status)
VALUES
    -- Year 1 disbursements (FY 2023-24)
    ('a1000001-0001-4000-8000-000000000001', '3', 3000000, 'USD', '2023-04-15', 'World Bank - IDA', 'Ministry of Education', 'Q1 FY2023-24: Initial mobilization and site preparation', 'actual'),
    ('a1000001-0001-4000-8000-000000000001', '3', 3200000, 'USD', '2023-07-15', 'World Bank - IDA', 'Ministry of Education', 'Q2 FY2023-24: Construction materials procurement', 'actual'),
    ('a1000001-0001-4000-8000-000000000001', '3', 2800000, 'USD', '2023-10-15', 'World Bank - IDA', 'Ministry of Education', 'Q3 FY2023-24: School construction Phase 1 - Shan State', 'actual'),
    ('a1000001-0001-4000-8000-000000000001', '3', 3000000, 'USD', '2024-01-15', 'World Bank - IDA', 'Ministry of Education', 'Q4 FY2023-24: Teacher training program launch', 'actual'),
    -- Year 2 disbursements (FY 2024-25)
    ('a1000001-0001-4000-8000-000000000001', '3', 3500000, 'USD', '2024-04-15', 'World Bank - IDA', 'Ministry of Education', 'Q1 FY2024-25: Phase 2 construction - Kayah State', 'actual'),
    ('a1000001-0001-4000-8000-000000000001', '3', 3400000, 'USD', '2024-07-15', 'World Bank - IDA', 'Ministry of Education', 'Q2 FY2024-25: Furniture and equipment procurement', 'actual'),
    ('a1000001-0001-4000-8000-000000000001', '3', 3300000, 'USD', '2024-10-15', 'World Bank - IDA', 'Ministry of Education', 'Q3 FY2024-25: School construction Phase 2 - Kayin State', 'actual'),
    -- Expenditures recorded
    ('a1000001-0001-4000-8000-000000000001', '4', 11500000, 'USD', '2024-03-31', 'Ministry of Education', 'Various Contractors', 'FY2023-24 total expenditure: Construction and equipment', 'actual'),
    ('a1000001-0001-4000-8000-000000000001', '4', 6800000, 'USD', '2024-09-30', 'Ministry of Education', 'Various Contractors', 'FY2024-25 H1 expenditure: Construction progress payments', 'actual');

-- Activity 2: Maternal and Child Health Improvement Program (MCHIP-AYR) - HUMANITARIAN
-- Total budget: ~$28M | Disbursed to date: ~$20M
INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status)
VALUES
    -- Year 1 disbursements (2022)
    ('a1000001-0001-4000-8000-000000000002', '3', 1200000, 'USD', '2022-01-15', 'USAID', 'Ministry of Health', 'Q1 2022: Program inception and baseline surveys', 'actual'),
    ('a1000001-0001-4000-8000-000000000002', '3', 1400000, 'USD', '2022-04-15', 'USAID', 'Ministry of Health', 'Q2 2022: Health facility upgrades', 'actual'),
    ('a1000001-0001-4000-8000-000000000002', '3', 1300000, 'USD', '2022-07-15', 'USAID', 'Ministry of Health', 'Q3 2022: Midwife training program', 'actual'),
    ('a1000001-0001-4000-8000-000000000002', '3', 1300000, 'USD', '2022-10-15', 'USAID', 'Ministry of Health', 'Q4 2022: Medical supplies and vaccines', 'actual'),
    -- Year 2 disbursements (2023)
    ('a1000001-0001-4000-8000-000000000002', '3', 1500000, 'USD', '2023-01-15', 'USAID', 'Ministry of Health', 'Q1 2023: Mobile health clinics deployment', 'actual'),
    ('a1000001-0001-4000-8000-000000000002', '3', 1600000, 'USD', '2023-04-15', 'USAID', 'Ministry of Health', 'Q2 2023: Community health worker training', 'actual'),
    ('a1000001-0001-4000-8000-000000000002', '3', 1500000, 'USD', '2023-07-15', 'USAID', 'Ministry of Health', 'Q3 2023: Nutrition programs expansion', 'actual'),
    ('a1000001-0001-4000-8000-000000000002', '3', 1500000, 'USD', '2023-10-15', 'USAID', 'Ministry of Health', 'Q4 2023: Emergency obstetric care equipment', 'actual'),
    -- Year 3 disbursements (2024)
    ('a1000001-0001-4000-8000-000000000002', '3', 1600000, 'USD', '2024-01-15', 'USAID', 'Ministry of Health', 'Q1 2024: Antenatal care services expansion', 'actual'),
    ('a1000001-0001-4000-8000-000000000002', '3', 1700000, 'USD', '2024-04-15', 'USAID', 'Ministry of Health', 'Q2 2024: Immunization campaign', 'actual'),
    ('a1000001-0001-4000-8000-000000000002', '3', 1600000, 'USD', '2024-07-15', 'USAID', 'Ministry of Health', 'Q3 2024: Health information systems', 'actual'),
    ('a1000001-0001-4000-8000-000000000002', '3', 1600000, 'USD', '2024-10-15', 'USAID', 'Ministry of Health', 'Q4 2024: Facility-based deliveries program', 'actual'),
    -- Expenditures
    ('a1000001-0001-4000-8000-000000000002', '4', 5000000, 'USD', '2022-12-31', 'Ministry of Health', 'Health Service Providers', '2022 total expenditure: Health services delivery', 'actual'),
    ('a1000001-0001-4000-8000-000000000002', '4', 5900000, 'USD', '2023-12-31', 'Ministry of Health', 'Health Service Providers', '2023 total expenditure: MCH services and training', 'actual'),
    ('a1000001-0001-4000-8000-000000000002', '4', 5200000, 'USD', '2024-09-30', 'Ministry of Health', 'Health Service Providers', '2024 YTD expenditure: Health programs', 'actual');

-- Activity 3: Climate-Smart Rice Value Chain Development (CSRVC)
-- Total budget: ~$85M | Disbursed to date: ~$28M
INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status)
VALUES
    -- Incoming funds (loan drawdown)
    ('a1000001-0001-4000-8000-000000000003', '1', 15000000, 'USD', '2023-07-01', 'Asian Development Bank', 'Ministry of Finance', 'Initial loan drawdown - Year 1 allocation', 'actual'),
    ('a1000001-0001-4000-8000-000000000003', '1', 18500000, 'USD', '2024-07-01', 'Asian Development Bank', 'Ministry of Finance', 'Year 2 loan drawdown', 'actual'),
    -- Disbursements to implementing agencies
    ('a1000001-0001-4000-8000-000000000003', '3', 4000000, 'USD', '2023-08-15', 'Ministry of Finance', 'Ministry of Agriculture', 'Q1 FY2023-24: Irrigation infrastructure design', 'actual'),
    ('a1000001-0001-4000-8000-000000000003', '3', 3800000, 'USD', '2023-11-15', 'Ministry of Finance', 'Ministry of Agriculture', 'Q2 FY2023-24: Seed multiplication centers', 'actual'),
    ('a1000001-0001-4000-8000-000000000003', '3', 3700000, 'USD', '2024-02-15', 'Ministry of Finance', 'Ministry of Agriculture', 'Q3 FY2023-24: Farmer training programs', 'actual'),
    ('a1000001-0001-4000-8000-000000000003', '3', 3500000, 'USD', '2024-05-15', 'Ministry of Finance', 'Ministry of Agriculture', 'Q4 FY2023-24: Rice mill modernization', 'actual'),
    ('a1000001-0001-4000-8000-000000000003', '3', 4500000, 'USD', '2024-08-15', 'Ministry of Finance', 'Ministry of Agriculture', 'Q1 FY2024-25: Irrigation construction Phase 1', 'actual'),
    ('a1000001-0001-4000-8000-000000000003', '3', 4800000, 'USD', '2024-11-15', 'Ministry of Finance', 'Ministry of Agriculture', 'Q2 FY2024-25: Climate-resilient seed distribution', 'actual'),
    -- Expenditures
    ('a1000001-0001-4000-8000-000000000003', '4', 14200000, 'USD', '2024-06-30', 'Ministry of Agriculture', 'Contractors and Suppliers', 'FY2023-24 expenditure: Infrastructure and inputs', 'actual'),
    ('a1000001-0001-4000-8000-000000000003', '4', 8500000, 'USD', '2024-11-30', 'Ministry of Agriculture', 'Contractors and Suppliers', 'FY2024-25 H1 expenditure: Ongoing works', 'actual');

-- Activity 4: Rural Water Supply and Sanitation Program (RWSSIP)
-- Total budget: ~AUD 52M | Disbursed to date: ~AUD 18M
INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status)
VALUES
    -- Year 1 disbursements (2024)
    ('a1000001-0001-4000-8000-000000000004', '3', 2200000, 'AUD', '2024-01-15', 'DFAT Australia', 'Ministry of Construction', 'Q1 2024: Program setup and community mobilization', 'actual'),
    ('a1000001-0001-4000-8000-000000000004', '3', 2500000, 'AUD', '2024-04-15', 'DFAT Australia', 'Ministry of Construction', 'Q2 2024: Water source identification and testing', 'actual'),
    ('a1000001-0001-4000-8000-000000000004', '3', 2400000, 'AUD', '2024-07-15', 'DFAT Australia', 'Ministry of Construction', 'Q3 2024: Borehole drilling - Chin State', 'actual'),
    ('a1000001-0001-4000-8000-000000000004', '3', 2400000, 'AUD', '2024-10-15', 'DFAT Australia', 'Ministry of Construction', 'Q4 2024: Water treatment systems installation', 'actual'),
    -- Co-financing from Government of Myanmar
    ('a1000001-0001-4000-8000-000000000004', '1', 5000000, 'USD', '2024-02-01', 'Government of Myanmar', 'Ministry of Construction', 'Government counterpart funding for WASH program', 'actual'),
    -- Expenditures
    ('a1000001-0001-4000-8000-000000000004', '4', 8500000, 'AUD', '2024-09-30', 'Ministry of Construction', 'WASH Contractors', '2024 YTD expenditure: Infrastructure works', 'actual');

-- Activity 5: Rural Roads Connectivity Project (RRCMAP)
-- Total budget: ~$120M | Disbursed to date: ~$58M
INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status)
VALUES
    -- Year 1 disbursements (FY 2022-23)
    ('a1000001-0001-4000-8000-000000000005', '3', 4500000, 'USD', '2022-06-15', 'World Bank - IBRD', 'Ministry of Construction', 'Q1 FY2022-23: Project management unit setup', 'actual'),
    ('a1000001-0001-4000-8000-000000000005', '3', 4200000, 'USD', '2022-09-15', 'World Bank - IBRD', 'Ministry of Construction', 'Q2 FY2022-23: Engineering surveys and designs', 'actual'),
    ('a1000001-0001-4000-8000-000000000005', '3', 4800000, 'USD', '2022-12-15', 'World Bank - IBRD', 'Ministry of Construction', 'Q3 FY2022-23: Equipment procurement', 'actual'),
    ('a1000001-0001-4000-8000-000000000005', '3', 4500000, 'USD', '2023-03-15', 'World Bank - IBRD', 'Ministry of Construction', 'Q4 FY2022-23: Road construction Mon State Phase 1', 'actual'),
    -- Year 2 disbursements (FY 2023-24)
    ('a1000001-0001-4000-8000-000000000005', '3', 6200000, 'USD', '2023-06-15', 'World Bank - IBRD', 'Ministry of Construction', 'Q1 FY2023-24: Road construction acceleration', 'actual'),
    ('a1000001-0001-4000-8000-000000000005', '3', 6500000, 'USD', '2023-09-15', 'World Bank - IBRD', 'Ministry of Construction', 'Q2 FY2023-24: Bridge construction works', 'actual'),
    ('a1000001-0001-4000-8000-000000000005', '3', 6000000, 'USD', '2023-12-15', 'World Bank - IBRD', 'Ministry of Construction', 'Q3 FY2023-24: Tanintharyi Region expansion', 'actual'),
    ('a1000001-0001-4000-8000-000000000005', '3', 6300000, 'USD', '2024-03-15', 'World Bank - IBRD', 'Ministry of Construction', 'Q4 FY2023-24: Road surfacing and drainage', 'actual'),
    -- Year 3 disbursements (FY 2024-25)
    ('a1000001-0001-4000-8000-000000000005', '3', 7000000, 'USD', '2024-06-15', 'World Bank - IBRD', 'Ministry of Construction', 'Q1 FY2024-25: Major bridge completion', 'actual'),
    ('a1000001-0001-4000-8000-000000000005', '3', 7200000, 'USD', '2024-09-15', 'World Bank - IBRD', 'Ministry of Construction', 'Q2 FY2024-25: Road network expansion Phase 2', 'actual'),
    -- Expenditures
    ('a1000001-0001-4000-8000-000000000005', '4', 17000000, 'USD', '2023-05-31', 'Ministry of Construction', 'Road Construction Firms', 'FY2022-23 expenditure: Construction works', 'actual'),
    ('a1000001-0001-4000-8000-000000000005', '4', 12000000, 'USD', '2023-12-31', 'Ministry of Construction', 'Road Construction Firms', 'FY2023-24 H1 expenditure: Roads and bridges', 'actual'),
    ('a1000001-0001-4000-8000-000000000005', '4', 12000000, 'USD', '2024-05-31', 'Ministry of Construction', 'Road Construction Firms', 'FY2023-24 H2 expenditure: Roads and bridges', 'actual'),
    ('a1000001-0001-4000-8000-000000000005', '4', 12500000, 'USD', '2024-09-30', 'Ministry of Construction', 'Road Construction Firms', 'FY2024-25 H1 expenditure: Ongoing construction', 'actual');

-- Activity 6: Emergency Humanitarian Assistance - Rakhine (EHADP-RKN) - HUMANITARIAN
-- Total budget: ~$35M | Disbursed to date: ~$22M (rapid disbursement)
INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status)
VALUES
    -- Rapid disbursements (humanitarian - monthly)
    ('a1000001-0001-4000-8000-000000000006', '3', 3500000, 'USD', '2024-01-05', 'UN OCHA - CERF', 'UNHCR Myanmar', 'Jan 2024: Emergency shelter materials', 'actual'),
    ('a1000001-0001-4000-8000-000000000006', '3', 3200000, 'USD', '2024-02-05', 'UN OCHA - CERF', 'WFP Myanmar', 'Feb 2024: Food assistance distribution', 'actual'),
    ('a1000001-0001-4000-8000-000000000006', '3', 2800000, 'USD', '2024-03-05', 'UN OCHA - CERF', 'UNICEF Myanmar', 'Mar 2024: WASH emergency supplies', 'actual'),
    ('a1000001-0001-4000-8000-000000000006', '3', 3000000, 'USD', '2024-04-05', 'UN OCHA - CERF', 'WHO Myanmar', 'Apr 2024: Emergency health services', 'actual'),
    ('a1000001-0001-4000-8000-000000000006', '3', 2500000, 'USD', '2024-05-05', 'UN OCHA - CERF', 'UNHCR Myanmar', 'May 2024: Protection services', 'actual'),
    ('a1000001-0001-4000-8000-000000000006', '3', 2200000, 'USD', '2024-06-05', 'UN OCHA - CERF', 'WFP Myanmar', 'Jun 2024: Monsoon preparedness', 'actual'),
    ('a1000001-0001-4000-8000-000000000006', '3', 2000000, 'USD', '2024-07-05', 'UN OCHA - CERF', 'UNICEF Myanmar', 'Jul 2024: Child protection and education', 'actual'),
    ('a1000001-0001-4000-8000-000000000006', '3', 1800000, 'USD', '2024-08-05', 'UN OCHA - CERF', 'IOM Myanmar', 'Aug 2024: Camp management support', 'actual'),
    ('a1000001-0001-4000-8000-000000000006', '3', 1500000, 'USD', '2024-09-05', 'UN OCHA - CERF', 'WHO Myanmar', 'Sep 2024: Health outreach to host communities', 'actual'),
    -- Expenditures (rapid utilization)
    ('a1000001-0001-4000-8000-000000000006', '4', 10000000, 'USD', '2024-03-31', 'UN Agencies', 'Service Providers', 'Q1 2024 expenditure: Emergency response', 'actual'),
    ('a1000001-0001-4000-8000-000000000006', '4', 8500000, 'USD', '2024-06-30', 'UN Agencies', 'Service Providers', 'Q2 2024 expenditure: Humanitarian services', 'actual'),
    ('a1000001-0001-4000-8000-000000000006', '4', 4200000, 'USD', '2024-09-30', 'UN Agencies', 'Service Providers', 'Q3 2024 expenditure: Ongoing response', 'actual');

-- Activity 7: Local Governance Capacity Building Program (LGPASP)
-- Total budget: ~$22M | Disbursed to date: ~$10M
INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status)
VALUES
    -- Year 1 disbursements (2023)
    ('a1000001-0001-4000-8000-000000000007', '3', 900000, 'USD', '2023-01-15', 'UNDP', 'General Administration Department', 'Q1 2023: Program launch and needs assessment', 'actual'),
    ('a1000001-0001-4000-8000-000000000007', '3', 950000, 'USD', '2023-04-15', 'UNDP', 'General Administration Department', 'Q2 2023: Training curriculum development', 'actual'),
    ('a1000001-0001-4000-8000-000000000007', '3', 1000000, 'USD', '2023-07-15', 'UNDP', 'General Administration Department', 'Q3 2023: Township official training - Mandalay', 'actual'),
    ('a1000001-0001-4000-8000-000000000007', '3', 950000, 'USD', '2023-10-15', 'UNDP', 'General Administration Department', 'Q4 2023: E-governance pilot systems', 'actual'),
    -- Year 2 disbursements (2024)
    ('a1000001-0001-4000-8000-000000000007', '3', 1100000, 'USD', '2024-01-15', 'UNDP', 'General Administration Department', 'Q1 2024: Citizen services centers setup', 'actual'),
    ('a1000001-0001-4000-8000-000000000007', '3', 1150000, 'USD', '2024-04-15', 'UNDP', 'General Administration Department', 'Q2 2024: Digital literacy training', 'actual'),
    ('a1000001-0001-4000-8000-000000000007', '3', 1100000, 'USD', '2024-07-15', 'UNDP', 'General Administration Department', 'Q3 2024: Yangon Region expansion', 'actual'),
    ('a1000001-0001-4000-8000-000000000007', '3', 1150000, 'USD', '2024-10-15', 'UNDP', 'General Administration Department', 'Q4 2024: Public financial management', 'actual'),
    -- Expenditures
    ('a1000001-0001-4000-8000-000000000007', '4', 3600000, 'USD', '2023-12-31', 'General Administration Department', 'Training Providers', '2023 expenditure: Governance programs', 'actual'),
    ('a1000001-0001-4000-8000-000000000007', '4', 4200000, 'USD', '2024-09-30', 'General Administration Department', 'Training Providers', '2024 YTD expenditure: Capacity building', 'actual');

-- Activity 8: Women's Economic Empowerment and Microfinance (WEEMST)
-- Total budget: ~$18M | Disbursed to date: ~$6M
INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status)
VALUES
    -- Year 1 disbursements (FY 2023-24)
    ('a1000001-0001-4000-8000-000000000008', '3', 750000, 'USD', '2023-10-15', 'UN Women', 'Department of Social Welfare', 'Q1 FY2023-24: VSLA group formation - Kachin', 'actual'),
    ('a1000001-0001-4000-8000-000000000008', '3', 850000, 'USD', '2024-01-15', 'UN Women', 'Department of Social Welfare', 'Q2 FY2023-24: Financial literacy training', 'actual'),
    ('a1000001-0001-4000-8000-000000000008', '3', 800000, 'USD', '2024-04-15', 'UN Women', 'Department of Social Welfare', 'Q3 FY2023-24: Microfinance capital injection', 'actual'),
    ('a1000001-0001-4000-8000-000000000008', '3', 800000, 'USD', '2024-07-15', 'UN Women', 'Department of Social Welfare', 'Q4 FY2023-24: Business skills training', 'actual'),
    -- Year 2 disbursements (FY 2024-25)
    ('a1000001-0001-4000-8000-000000000008', '3', 950000, 'USD', '2024-10-15', 'UN Women', 'Department of Social Welfare', 'Q1 FY2024-25: Shan State expansion', 'actual'),
    -- Revolving loan fund (incoming from repayments)
    ('a1000001-0001-4000-8000-000000000008', '1', 150000, 'USD', '2024-06-30', 'VSLA Groups', 'Department of Social Welfare', 'H1 2024: Microfinance loan repayments', 'actual'),
    ('a1000001-0001-4000-8000-000000000008', '1', 180000, 'USD', '2024-09-30', 'VSLA Groups', 'Department of Social Welfare', 'Q3 2024: Microfinance loan repayments', 'actual'),
    -- Expenditures
    ('a1000001-0001-4000-8000-000000000008', '4', 3000000, 'USD', '2024-09-30', 'Department of Social Welfare', 'MFIs and NGO Partners', 'FY2023-24 expenditure: Training and capital', 'actual');

-- Activity 9: Coastal Mangrove Restoration Program (CMRCCR)
-- Total budget: ~EUR 32M | Disbursed to date: ~EUR 10M
INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status)
VALUES
    -- Year 1 disbursements (FY 2024-25)
    ('a1000001-0001-4000-8000-000000000009', '3', 1400000, 'EUR', '2024-04-15', 'European Union', 'Ministry of Natural Resources', 'Q1 FY2024-25: Nursery establishment', 'actual'),
    ('a1000001-0001-4000-8000-000000000009', '3', 1500000, 'EUR', '2024-07-15', 'European Union', 'Ministry of Natural Resources', 'Q2 FY2024-25: Community training - Ayeyarwady', 'actual'),
    ('a1000001-0001-4000-8000-000000000009', '3', 1400000, 'EUR', '2024-10-15', 'European Union', 'Ministry of Natural Resources', 'Q3 FY2024-25: Planting season Phase 1', 'actual'),
    -- Co-financing from GCF
    ('a1000001-0001-4000-8000-000000000009', '1', 8000000, 'USD', '2024-05-01', 'Green Climate Fund', 'Ministry of Natural Resources', 'GCF co-financing for climate resilience component', 'actual'),
    -- Disbursement of GCF funds
    ('a1000001-0001-4000-8000-000000000009', '3', 2000000, 'USD', '2024-06-15', 'Ministry of Natural Resources', 'Forest Department', 'GCF funds: Climate monitoring equipment', 'actual'),
    ('a1000001-0001-4000-8000-000000000009', '3', 2500000, 'USD', '2024-09-15', 'Ministry of Natural Resources', 'Forest Department', 'GCF funds: Coastal protection infrastructure', 'actual'),
    -- Expenditures
    ('a1000001-0001-4000-8000-000000000009', '4', 4000000, 'EUR', '2024-09-30', 'Ministry of Natural Resources', 'Environmental NGOs', 'FY2024-25 H1 expenditure: Restoration works', 'actual'),
    ('a1000001-0001-4000-8000-000000000009', '4', 4000000, 'USD', '2024-09-30', 'Ministry of Natural Resources', 'Environmental NGOs', 'GCF component expenditure: Climate resilience', 'actual');

-- Activity 10: Maternal and Child Cash Transfer Program (MCCT-NS) - HUMANITARIAN
-- Total budget: ~$42M | Disbursed to date: ~$18M
INSERT INTO transactions (activity_id, transaction_type, value, currency, transaction_date, provider_org_name, receiver_org_name, description, status)
VALUES
    -- Year 1 disbursements (FY 2023-24) - frequent for cash transfer programs
    ('a1000001-0001-4000-8000-000000000010', '3', 1500000, 'USD', '2023-07-15', 'World Bank - IDA', 'Department of Social Welfare', 'Jul 2023: Program launch - Chin State', 'actual'),
    ('a1000001-0001-4000-8000-000000000010', '3', 1600000, 'USD', '2023-09-15', 'World Bank - IDA', 'Department of Social Welfare', 'Sep 2023: Beneficiary registration', 'actual'),
    ('a1000001-0001-4000-8000-000000000010', '3', 1700000, 'USD', '2023-11-15', 'World Bank - IDA', 'Department of Social Welfare', 'Nov 2023: First cash transfer cycle', 'actual'),
    ('a1000001-0001-4000-8000-000000000010', '3', 1600000, 'USD', '2024-01-15', 'World Bank - IDA', 'Department of Social Welfare', 'Jan 2024: Q1 cash transfers', 'actual'),
    ('a1000001-0001-4000-8000-000000000010', '3', 1800000, 'USD', '2024-03-15', 'World Bank - IDA', 'Department of Social Welfare', 'Mar 2024: Rakhine State expansion', 'actual'),
    -- Year 2 disbursements (FY 2024-25)
    ('a1000001-0001-4000-8000-000000000010', '3', 1900000, 'USD', '2024-05-15', 'World Bank - IDA', 'Department of Social Welfare', 'May 2024: Q2 cash transfers', 'actual'),
    ('a1000001-0001-4000-8000-000000000010', '3', 2000000, 'USD', '2024-07-15', 'World Bank - IDA', 'Department of Social Welfare', 'Jul 2024: Q3 cash transfers - scale up', 'actual'),
    ('a1000001-0001-4000-8000-000000000010', '3', 1900000, 'USD', '2024-09-15', 'World Bank - IDA', 'Department of Social Welfare', 'Sep 2024: Nutrition-linked payments', 'actual'),
    ('a1000001-0001-4000-8000-000000000010', '3', 2000000, 'USD', '2024-11-15', 'World Bank - IDA', 'Department of Social Welfare', 'Nov 2024: Q4 cash transfers', 'actual'),
    -- Mobile money transfers to beneficiaries (expenditures)
    ('a1000001-0001-4000-8000-000000000010', '4', 5000000, 'USD', '2023-12-31', 'Department of Social Welfare', 'Mobile Money Operators', 'FY2023-24 H1: Cash transfers to beneficiaries', 'actual'),
    ('a1000001-0001-4000-8000-000000000010', '4', 4200000, 'USD', '2024-06-30', 'Department of Social Welfare', 'Mobile Money Operators', 'FY2023-24 H2: Cash transfers to beneficiaries', 'actual'),
    ('a1000001-0001-4000-8000-000000000010', '4', 5800000, 'USD', '2024-09-30', 'Department of Social Welfare', 'Mobile Money Operators', 'FY2024-25 H1: Cash transfers to beneficiaries', 'actual');

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Total transaction records created: 90
--
-- Transaction breakdown by activity:
--   1. RPSCTP (Education) - 9 transactions: ~$22M disbursed
--   2. MCHIP-AYR (Health/Humanitarian) - 15 transactions: ~$20M disbursed
--   3. CSRVC (Agriculture) - 10 transactions: ~$28M disbursed
--   4. RWSSIP (WASH) - 6 transactions: ~AUD 18M disbursed
--   5. RRCMAP (Infrastructure) - 14 transactions: ~$58M disbursed
--   6. EHADP-RKN (Humanitarian) - 12 transactions: ~$22M disbursed
--   7. LGPASP (Governance) - 10 transactions: ~$10M disbursed
--   8. WEEMST (Livelihoods) - 8 transactions: ~$6M disbursed
--   9. CMRCCR (Environment) - 8 transactions: ~EUR 10M + $8M GCF disbursed
--   10. MCCT-NS (Social Protection/Humanitarian) - 12 transactions: ~$18M disbursed
--
-- Transaction types used:
--   '1' = Incoming Funds (loan drawdowns, co-financing, loan repayments)
--   '3' = Disbursement (funds released to implementers)
--   '4' = Expenditure (actual spending recorded)
--
-- NOTE: Commitment transactions (type '2') are excluded due to database
-- trigger limitations with large values. Program commitments are tracked
-- via the activity_budgets table.
--
-- After running this SQL, call the USD conversion API to populate value_usd:
-- POST /api/transactions/backfill-usd
-- ============================================================================
