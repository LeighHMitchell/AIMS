-- ============================================================================
-- SEED DATA: Planned Disbursements for 10 Myanmar Development Activities
-- ============================================================================
-- This script creates quarterly planned disbursement records for each activity.
-- Disbursements are spread across project duration with realistic patterns.
-- ============================================================================

-- Activity 1: Rural Primary School Construction Program (RPSCTP)
-- Quarterly disbursements 2023-2027 (~$45M total)
INSERT INTO planned_disbursements (activity_id, type, period_start, period_end, amount, currency, value_date, status, notes)
VALUES
    -- Year 1 (2023-2024)
    ('a1000001-0001-4000-8000-000000000001', '1', '2023-04-01', '2023-06-30', 2500000, 'USD', '2023-04-01', 'original', 'Q1: Project inception and site assessments'),
    ('a1000001-0001-4000-8000-000000000001', '1', '2023-07-01', '2023-09-30', 3200000, 'USD', '2023-07-01', 'original', 'Q2: Construction materials procurement'),
    ('a1000001-0001-4000-8000-000000000001', '1', '2023-10-01', '2023-12-31', 3500000, 'USD', '2023-10-01', 'original', 'Q3: School construction phase 1'),
    ('a1000001-0001-4000-8000-000000000001', '1', '2024-01-01', '2024-03-31', 2800000, 'USD', '2024-01-01', 'original', 'Q4: Teacher training program launch'),
    -- Year 2 (2024-2025)
    ('a1000001-0001-4000-8000-000000000001', '1', '2024-04-01', '2024-06-30', 3600000, 'USD', '2024-04-01', 'original', 'Q1: Construction phase 2'),
    ('a1000001-0001-4000-8000-000000000001', '1', '2024-07-01', '2024-09-30', 3800000, 'USD', '2024-07-01', 'original', 'Q2: Peak construction period'),
    ('a1000001-0001-4000-8000-000000000001', '1', '2024-10-01', '2024-12-31', 3200000, 'USD', '2024-10-01', 'original', 'Q3: Equipment and furniture'),
    ('a1000001-0001-4000-8000-000000000001', '1', '2025-01-01', '2025-03-31', 2900000, 'USD', '2025-01-01', 'original', 'Q4: Teacher training continuation'),
    -- Year 3 (2025-2026)
    ('a1000001-0001-4000-8000-000000000001', '1', '2025-04-01', '2025-06-30', 2800000, 'USD', '2025-04-01', 'original', 'Q1: Construction completion'),
    ('a1000001-0001-4000-8000-000000000001', '1', '2025-07-01', '2025-09-30', 3000000, 'USD', '2025-07-01', 'original', 'Q2: PTA establishment'),
    ('a1000001-0001-4000-8000-000000000001', '1', '2025-10-01', '2025-12-31', 2700000, 'USD', '2025-10-01', 'original', 'Q3: Monitoring and evaluation'),
    ('a1000001-0001-4000-8000-000000000001', '1', '2026-01-01', '2026-03-31', 2500000, 'USD', '2026-01-01', 'original', 'Q4: Capacity building'),
    -- Year 4 (2026-2027)
    ('a1000001-0001-4000-8000-000000000001', '1', '2026-04-01', '2026-06-30', 2200000, 'USD', '2026-04-01', 'original', 'Q1: Sustainability planning'),
    ('a1000001-0001-4000-8000-000000000001', '1', '2026-07-01', '2026-09-30', 2300000, 'USD', '2026-07-01', 'original', 'Q2: Final teacher training'),
    ('a1000001-0001-4000-8000-000000000001', '1', '2026-10-01', '2026-12-31', 2100000, 'USD', '2026-10-01', 'original', 'Q3: Project handover preparation'),
    ('a1000001-0001-4000-8000-000000000001', '1', '2027-01-01', '2027-03-31', 1900000, 'USD', '2027-01-01', 'original', 'Q4: Final evaluation and closure');

-- Activity 2: Maternal and Child Health Improvement Program (MCHIP-AYR)
-- Quarterly disbursements 2022-2026 (~$28M total)
INSERT INTO planned_disbursements (activity_id, type, period_start, period_end, amount, currency, value_date, status, notes)
VALUES
    -- Year 1 (2022)
    ('a1000001-0001-4000-8000-000000000002', '1', '2022-01-01', '2022-03-31', 1100000, 'USD', '2022-01-01', 'original', 'Q1: Program setup and baseline survey'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2022-04-01', '2022-06-30', 1300000, 'USD', '2022-04-01', 'original', 'Q2: Health center assessments'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2022-07-01', '2022-09-30', 1400000, 'USD', '2022-07-01', 'original', 'Q3: Midwife training program'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2022-10-01', '2022-12-31', 1400000, 'USD', '2022-10-01', 'original', 'Q4: Equipment procurement'),
    -- Year 2 (2023)
    ('a1000001-0001-4000-8000-000000000002', '1', '2023-01-01', '2023-03-31', 1500000, 'USD', '2023-01-01', 'original', 'Q1: Service delivery expansion'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2023-04-01', '2023-06-30', 1600000, 'USD', '2023-04-01', 'original', 'Q2: Community outreach campaigns'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2023-07-01', '2023-09-30', 1500000, 'USD', '2023-07-01', 'original', 'Q3: Nutrition interventions'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2023-10-01', '2023-12-31', 1500000, 'USD', '2023-10-01', 'original', 'Q4: Referral system strengthening'),
    -- Year 3 (2024)
    ('a1000001-0001-4000-8000-000000000002', '1', '2024-01-01', '2024-03-31', 1700000, 'USD', '2024-01-01', 'original', 'Q1: Scale-up phase'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2024-04-01', '2024-06-30', 1700000, 'USD', '2024-04-01', 'original', 'Q2: Additional health centers'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2024-07-01', '2024-09-30', 1600000, 'USD', '2024-07-01', 'original', 'Q3: Quality improvement'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2024-10-01', '2024-12-31', 1500000, 'USD', '2024-10-01', 'original', 'Q4: Mid-term evaluation'),
    -- Year 4 (2025)
    ('a1000001-0001-4000-8000-000000000002', '1', '2025-01-01', '2025-03-31', 1500000, 'USD', '2025-01-01', 'original', 'Q1: Consolidation phase'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2025-04-01', '2025-06-30', 1500000, 'USD', '2025-04-01', 'original', 'Q2: Health worker retention'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2025-07-01', '2025-09-30', 1400000, 'USD', '2025-07-01', 'original', 'Q3: Systems strengthening'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2025-10-01', '2025-12-31', 1400000, 'USD', '2025-10-01', 'original', 'Q4: Sustainability planning'),
    -- Year 5 (2026)
    ('a1000001-0001-4000-8000-000000000002', '1', '2026-01-01', '2026-03-31', 1200000, 'USD', '2026-01-01', 'original', 'Q1: Transition to government'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2026-04-01', '2026-06-30', 1100000, 'USD', '2026-04-01', 'original', 'Q2: Knowledge transfer'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2026-07-01', '2026-09-30', 1100000, 'USD', '2026-07-01', 'original', 'Q3: Final monitoring'),
    ('a1000001-0001-4000-8000-000000000002', '1', '2026-10-01', '2026-12-31', 1000000, 'USD', '2026-10-01', 'original', 'Q4: Project closure');

-- Activity 3: Climate-Smart Rice Value Chain Development (CSRVC)
-- Quarterly disbursements 2023-2028 (~$85M total - large ADB project)
INSERT INTO planned_disbursements (activity_id, type, period_start, period_end, amount, currency, value_date, status, notes)
VALUES
    -- Year 1 (2023-2024)
    ('a1000001-0001-4000-8000-000000000003', '1', '2023-07-01', '2023-09-30', 3200000, 'USD', '2023-07-01', 'original', 'Q1: Inception and farmer registration'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2023-10-01', '2023-12-31', 3800000, 'USD', '2023-10-01', 'original', 'Q2: Seed variety procurement'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2024-01-01', '2024-03-31', 4000000, 'USD', '2024-01-01', 'original', 'Q3: Irrigation infrastructure'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2024-04-01', '2024-06-30', 4000000, 'USD', '2024-04-01', 'original', 'Q4: First planting season support'),
    -- Year 2 (2024-2025)
    ('a1000001-0001-4000-8000-000000000003', '1', '2024-07-01', '2024-09-30', 4500000, 'USD', '2024-07-01', 'original', 'Q1: Cooperative establishment'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2024-10-01', '2024-12-31', 5000000, 'USD', '2024-10-01', 'original', 'Q2: Post-harvest facilities'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2025-01-01', '2025-03-31', 4800000, 'USD', '2025-01-01', 'original', 'Q3: Market linkage development'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2025-04-01', '2025-06-30', 4200000, 'USD', '2025-04-01', 'original', 'Q4: Extension services'),
    -- Year 3 (2025-2026)
    ('a1000001-0001-4000-8000-000000000003', '1', '2025-07-01', '2025-09-30', 5200000, 'USD', '2025-07-01', 'original', 'Q1: Scale-up to additional townships'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2025-10-01', '2025-12-31', 5500000, 'USD', '2025-10-01', 'original', 'Q2: Climate adaptation measures'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2026-01-01', '2026-03-31', 5000000, 'USD', '2026-01-01', 'original', 'Q3: Rice milling investments'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2026-04-01', '2026-06-30', 4300000, 'USD', '2026-04-01', 'original', 'Q4: Quality certification'),
    -- Year 4 (2026-2027)
    ('a1000001-0001-4000-8000-000000000003', '1', '2026-07-01', '2026-09-30', 4800000, 'USD', '2026-07-01', 'original', 'Q1: Export market access'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2026-10-01', '2026-12-31', 4700000, 'USD', '2026-10-01', 'original', 'Q2: Financial services rollout'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2027-01-01', '2027-03-31', 4500000, 'USD', '2027-01-01', 'original', 'Q3: Cooperative strengthening'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2027-04-01', '2027-06-30', 4000000, 'USD', '2027-04-01', 'original', 'Q4: Knowledge management'),
    -- Year 5 (2027-2028)
    ('a1000001-0001-4000-8000-000000000003', '1', '2027-07-01', '2027-09-30', 3800000, 'USD', '2027-07-01', 'original', 'Q1: Sustainability assessment'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2027-10-01', '2027-12-31', 3500000, 'USD', '2027-10-01', 'original', 'Q2: Final investments'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2028-01-01', '2028-03-31', 3200000, 'USD', '2028-01-01', 'original', 'Q3: Impact evaluation'),
    ('a1000001-0001-4000-8000-000000000003', '1', '2028-04-01', '2028-06-30', 3000000, 'USD', '2028-04-01', 'original', 'Q4: Project completion');

-- Activity 4: Rural Water Supply and Sanitation Program (RWSSIP)
-- Quarterly disbursements 2024-2028 (~AUD 52M total)
INSERT INTO planned_disbursements (activity_id, type, period_start, period_end, amount, currency, value_date, status, notes)
VALUES
    -- Year 1 (2024)
    ('a1000001-0001-4000-8000-000000000004', '1', '2024-01-01', '2024-03-31', 2000000, 'AUD', '2024-01-01', 'original', 'Q1: Community mobilization'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2024-04-01', '2024-06-30', 2500000, 'AUD', '2024-04-01', 'original', 'Q2: Water source surveys'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2024-07-01', '2024-09-30', 2500000, 'AUD', '2024-07-01', 'original', 'Q3: Well drilling phase 1'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2024-10-01', '2024-12-31', 2500000, 'AUD', '2024-10-01', 'original', 'Q4: WASH committee training'),
    -- Year 2 (2025)
    ('a1000001-0001-4000-8000-000000000004', '1', '2025-01-01', '2025-03-31', 2800000, 'AUD', '2025-01-01', 'original', 'Q1: Latrine construction begins'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2025-04-01', '2025-06-30', 3000000, 'AUD', '2025-04-01', 'original', 'Q2: Water system installation'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2025-07-01', '2025-09-30', 2800000, 'AUD', '2025-07-01', 'original', 'Q3: Hygiene promotion campaigns'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2025-10-01', '2025-12-31', 2600000, 'AUD', '2025-10-01', 'original', 'Q4: School WASH facilities'),
    -- Year 3 (2026)
    ('a1000001-0001-4000-8000-000000000004', '1', '2026-01-01', '2026-03-31', 3200000, 'AUD', '2026-01-01', 'original', 'Q1: Scale-up construction'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2026-04-01', '2026-06-30', 3200000, 'AUD', '2026-04-01', 'original', 'Q2: Piped water systems'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2026-07-01', '2026-09-30', 2900000, 'AUD', '2026-07-01', 'original', 'Q3: ODF verification'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2026-10-01', '2026-12-31', 2700000, 'AUD', '2026-10-01', 'original', 'Q4: Accessibility improvements'),
    -- Year 4 (2027)
    ('a1000001-0001-4000-8000-000000000004', '1', '2027-01-01', '2027-03-31', 2800000, 'AUD', '2027-01-01', 'original', 'Q1: Remaining villages'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2027-04-01', '2027-06-30', 2800000, 'AUD', '2027-04-01', 'original', 'Q2: Water quality testing'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2027-07-01', '2027-09-30', 2700000, 'AUD', '2027-07-01', 'original', 'Q3: Maintenance training'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2027-10-01', '2027-12-31', 2500000, 'AUD', '2027-10-01', 'original', 'Q4: Handover preparation'),
    -- Year 5 (2028)
    ('a1000001-0001-4000-8000-000000000004', '1', '2028-01-01', '2028-03-31', 2200000, 'AUD', '2028-01-01', 'original', 'Q1: Final construction'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2028-04-01', '2028-06-30', 2100000, 'AUD', '2028-04-01', 'original', 'Q2: Sustainability assessment'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2028-07-01', '2028-09-30', 2100000, 'AUD', '2028-07-01', 'original', 'Q3: Documentation'),
    ('a1000001-0001-4000-8000-000000000004', '1', '2028-10-01', '2028-12-31', 2100000, 'AUD', '2028-10-01', 'original', 'Q4: Project closure');

-- Activity 5: Rural Roads Connectivity Project (RRCMAP)
-- Quarterly disbursements 2022-2027 (~$120M total - large WB project)
INSERT INTO planned_disbursements (activity_id, type, period_start, period_end, amount, currency, value_date, status, notes)
VALUES
    -- Year 1 (2022-2023)
    ('a1000001-0001-4000-8000-000000000005', '1', '2022-06-01', '2022-08-31', 3500000, 'USD', '2022-06-01', 'original', 'Q1: Detailed engineering design'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2022-09-01', '2022-11-30', 4500000, 'USD', '2022-09-01', 'original', 'Q2: Land acquisition'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2022-12-01', '2023-02-28', 5000000, 'USD', '2022-12-01', 'original', 'Q3: Contractor mobilization'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2023-03-01', '2023-05-31', 5000000, 'USD', '2023-03-01', 'original', 'Q4: Construction begins'),
    -- Year 2 (2023-2024)
    ('a1000001-0001-4000-8000-000000000005', '1', '2023-06-01', '2023-08-31', 6500000, 'USD', '2023-06-01', 'original', 'Q1: Road segment 1'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2023-09-01', '2023-11-30', 6500000, 'USD', '2023-09-01', 'original', 'Q2: Bridge construction'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2023-12-01', '2024-02-29', 6000000, 'USD', '2023-12-01', 'original', 'Q3: Dry season construction'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2024-03-01', '2024-05-31', 6000000, 'USD', '2024-03-01', 'original', 'Q4: Road segment 2'),
    -- Year 3 (2024-2025)
    ('a1000001-0001-4000-8000-000000000005', '1', '2024-06-01', '2024-08-31', 7500000, 'USD', '2024-06-01', 'original', 'Q1: Peak construction'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2024-09-01', '2024-11-30', 7500000, 'USD', '2024-09-01', 'original', 'Q2: Multiple road segments'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2024-12-01', '2025-02-28', 7000000, 'USD', '2024-12-01', 'original', 'Q3: Culvert and drainage'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2025-03-01', '2025-05-31', 6000000, 'USD', '2025-03-01', 'original', 'Q4: Road segment 3'),
    -- Year 4 (2025-2026)
    ('a1000001-0001-4000-8000-000000000005', '1', '2025-06-01', '2025-08-31', 7000000, 'USD', '2025-06-01', 'original', 'Q1: Final road segments'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2025-09-01', '2025-11-30', 7000000, 'USD', '2025-09-01', 'original', 'Q2: Asphalting phase'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2025-12-01', '2026-02-28', 6500000, 'USD', '2025-12-01', 'original', 'Q3: Road safety features'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2026-03-01', '2026-05-31', 6500000, 'USD', '2026-03-01', 'original', 'Q4: Maintenance training'),
    -- Year 5 (2026-2027)
    ('a1000001-0001-4000-8000-000000000005', '1', '2026-06-01', '2026-08-31', 5800000, 'USD', '2026-06-01', 'original', 'Q1: Completion works'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2026-09-01', '2026-11-30', 5700000, 'USD', '2026-09-01', 'original', 'Q2: Community road maintenance'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2026-12-01', '2027-02-28', 5500000, 'USD', '2026-12-01', 'original', 'Q3: Impact assessment'),
    ('a1000001-0001-4000-8000-000000000005', '1', '2027-03-01', '2027-05-31', 5000000, 'USD', '2027-03-01', 'original', 'Q4: Project closure');

-- Activity 6: Emergency Humanitarian Assistance - Rakhine (EHADP-RKN)
-- Quarterly disbursements 2024-2025 (~$35M total - humanitarian response)
INSERT INTO planned_disbursements (activity_id, type, period_start, period_end, amount, currency, value_date, status, notes)
VALUES
    -- Year 1 (2024)
    ('a1000001-0001-4000-8000-000000000006', '1', '2024-01-01', '2024-03-31', 5000000, 'USD', '2024-01-01', 'original', 'Q1: Emergency shelter distribution'),
    ('a1000001-0001-4000-8000-000000000006', '1', '2024-04-01', '2024-06-30', 4800000, 'USD', '2024-04-01', 'original', 'Q2: Food assistance scale-up'),
    ('a1000001-0001-4000-8000-000000000006', '1', '2024-07-01', '2024-09-30', 4500000, 'USD', '2024-07-01', 'original', 'Q3: Protection monitoring'),
    ('a1000001-0001-4000-8000-000000000006', '1', '2024-10-01', '2024-12-31', 4200000, 'USD', '2024-10-01', 'original', 'Q4: Winterization support'),
    -- Year 2 (2025)
    ('a1000001-0001-4000-8000-000000000006', '1', '2025-01-01', '2025-03-31', 4500000, 'USD', '2025-01-01', 'original', 'Q1: Continued food assistance'),
    ('a1000001-0001-4000-8000-000000000006', '1', '2025-04-01', '2025-06-30', 4200000, 'USD', '2025-04-01', 'original', 'Q2: Livelihood support'),
    ('a1000001-0001-4000-8000-000000000006', '1', '2025-07-01', '2025-09-30', 4000000, 'USD', '2025-07-01', 'original', 'Q3: Return and reintegration'),
    ('a1000001-0001-4000-8000-000000000006', '1', '2025-10-01', '2025-12-31', 3800000, 'USD', '2025-10-01', 'original', 'Q4: Transition planning');

-- Activity 7: Local Governance Capacity Building Program (LGPASP)
-- Quarterly disbursements 2023-2027 (~$22M total)
INSERT INTO planned_disbursements (activity_id, type, period_start, period_end, amount, currency, value_date, status, notes)
VALUES
    -- Year 1 (2023)
    ('a1000001-0001-4000-8000-000000000007', '1', '2023-01-01', '2023-03-31', 800000, 'USD', '2023-01-01', 'original', 'Q1: Needs assessment'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2023-04-01', '2023-06-30', 950000, 'USD', '2023-04-01', 'original', 'Q2: Training curriculum development'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2023-07-01', '2023-09-30', 1000000, 'USD', '2023-07-01', 'original', 'Q3: First cohort training'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2023-10-01', '2023-12-31', 1050000, 'USD', '2023-10-01', 'original', 'Q4: E-governance pilot'),
    -- Year 2 (2024)
    ('a1000001-0001-4000-8000-000000000007', '1', '2024-01-01', '2024-03-31', 1100000, 'USD', '2024-01-01', 'original', 'Q1: Digital systems rollout'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2024-04-01', '2024-06-30', 1200000, 'USD', '2024-04-01', 'original', 'Q2: Service delivery training'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2024-07-01', '2024-09-30', 1100000, 'USD', '2024-07-01', 'original', 'Q3: Citizen feedback mechanisms'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2024-10-01', '2024-12-31', 1100000, 'USD', '2024-10-01', 'original', 'Q4: Performance monitoring'),
    -- Year 3 (2025)
    ('a1000001-0001-4000-8000-000000000007', '1', '2025-01-01', '2025-03-31', 1300000, 'USD', '2025-01-01', 'original', 'Q1: Township expansion'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2025-04-01', '2025-06-30', 1400000, 'USD', '2025-04-01', 'original', 'Q2: Civil society engagement'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2025-07-01', '2025-09-30', 1300000, 'USD', '2025-07-01', 'original', 'Q3: Public finance training'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2025-10-01', '2025-12-31', 1200000, 'USD', '2025-10-01', 'original', 'Q4: Mid-term review'),
    -- Year 4 (2026)
    ('a1000001-0001-4000-8000-000000000007', '1', '2026-01-01', '2026-03-31', 1250000, 'USD', '2026-01-01', 'original', 'Q1: Consolidation phase'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2026-04-01', '2026-06-30', 1250000, 'USD', '2026-04-01', 'original', 'Q2: Leadership development'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2026-07-01', '2026-09-30', 1200000, 'USD', '2026-07-01', 'original', 'Q3: System institutionalization'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2026-10-01', '2026-12-31', 1100000, 'USD', '2026-10-01', 'original', 'Q4: Documentation'),
    -- Year 5 (2027)
    ('a1000001-0001-4000-8000-000000000007', '1', '2027-01-01', '2027-03-31', 1000000, 'USD', '2027-01-01', 'original', 'Q1: Final training rounds'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2027-04-01', '2027-06-30', 950000, 'USD', '2027-04-01', 'original', 'Q2: Knowledge products'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2027-07-01', '2027-09-30', 900000, 'USD', '2027-07-01', 'original', 'Q3: Impact evaluation'),
    ('a1000001-0001-4000-8000-000000000007', '1', '2027-10-01', '2027-12-31', 850000, 'USD', '2027-10-01', 'original', 'Q4: Project closure');

-- Activity 8: Women's Economic Empowerment and Microfinance (WEEMST)
-- Quarterly disbursements 2023-2028 (~$18M total)
INSERT INTO planned_disbursements (activity_id, type, period_start, period_end, amount, currency, value_date, status, notes)
VALUES
    -- Year 1 (2023-2024)
    ('a1000001-0001-4000-8000-000000000008', '1', '2023-10-01', '2023-12-31', 700000, 'USD', '2023-10-01', 'original', 'Q1: VSLA methodology training'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2024-01-01', '2024-03-31', 850000, 'USD', '2024-01-01', 'original', 'Q2: First VSLA groups formed'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2024-04-01', '2024-06-30', 850000, 'USD', '2024-04-01', 'original', 'Q3: Business skills training'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2024-07-01', '2024-09-30', 800000, 'USD', '2024-07-01', 'original', 'Q4: First loan disbursements'),
    -- Year 2 (2024-2025)
    ('a1000001-0001-4000-8000-000000000008', '1', '2024-10-01', '2024-12-31', 950000, 'USD', '2024-10-01', 'original', 'Q1: Vocational training starts'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2025-01-01', '2025-03-31', 1000000, 'USD', '2025-01-01', 'original', 'Q2: Market linkage events'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2025-04-01', '2025-06-30', 950000, 'USD', '2025-04-01', 'original', 'Q3: Cooperative registration'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2025-07-01', '2025-09-30', 900000, 'USD', '2025-07-01', 'original', 'Q4: Scale-up planning'),
    -- Year 3 (2025-2026)
    ('a1000001-0001-4000-8000-000000000008', '1', '2025-10-01', '2025-12-31', 1100000, 'USD', '2025-10-01', 'original', 'Q1: Additional townships'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2026-01-01', '2026-03-31', 1100000, 'USD', '2026-01-01', 'original', 'Q2: Women cooperative support'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2026-04-01', '2026-06-30', 1050000, 'USD', '2026-04-01', 'original', 'Q3: Financial literacy'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2026-07-01', '2026-09-30', 950000, 'USD', '2026-07-01', 'original', 'Q4: Product development'),
    -- Year 4 (2026-2027)
    ('a1000001-0001-4000-8000-000000000008', '1', '2026-10-01', '2026-12-31', 1000000, 'USD', '2026-10-01', 'original', 'Q1: MFI partnerships'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2027-01-01', '2027-03-31', 1000000, 'USD', '2027-01-01', 'original', 'Q2: Graduation pathway'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2027-04-01', '2027-06-30', 950000, 'USD', '2027-04-01', 'original', 'Q3: Leadership training'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2027-07-01', '2027-09-30', 950000, 'USD', '2027-07-01', 'original', 'Q4: Sustainability planning'),
    -- Year 5 (2027-2028)
    ('a1000001-0001-4000-8000-000000000008', '1', '2027-10-01', '2027-12-31', 800000, 'USD', '2027-10-01', 'original', 'Q1: Final cohort support'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2028-01-01', '2028-03-31', 750000, 'USD', '2028-01-01', 'original', 'Q2: Transition to local MFIs'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2028-04-01', '2028-06-30', 700000, 'USD', '2028-04-01', 'original', 'Q3: Impact assessment'),
    ('a1000001-0001-4000-8000-000000000008', '1', '2028-07-01', '2028-09-30', 650000, 'USD', '2028-07-01', 'original', 'Q4: Project closure');

-- Activity 9: Coastal Mangrove Restoration Program (CMRCCR)
-- Quarterly disbursements 2024-2029 (~EUR 32M total)
INSERT INTO planned_disbursements (activity_id, type, period_start, period_end, amount, currency, value_date, status, notes)
VALUES
    -- Year 1 (2024-2025)
    ('a1000001-0001-4000-8000-000000000009', '1', '2024-04-01', '2024-06-30', 1200000, 'EUR', '2024-04-01', 'original', 'Q1: Baseline ecological survey'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2024-07-01', '2024-09-30', 1500000, 'EUR', '2024-07-01', 'original', 'Q2: Nursery establishment'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2024-10-01', '2024-12-31', 1600000, 'EUR', '2024-10-01', 'original', 'Q3: Community mobilization'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2025-01-01', '2025-03-31', 1500000, 'EUR', '2025-01-01', 'original', 'Q4: First planting season'),
    -- Year 2 (2025-2026)
    ('a1000001-0001-4000-8000-000000000009', '1', '2025-04-01', '2025-06-30', 1800000, 'EUR', '2025-04-01', 'original', 'Q1: Large-scale restoration'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2025-07-01', '2025-09-30', 1900000, 'EUR', '2025-07-01', 'original', 'Q2: Livelihood diversification'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2025-10-01', '2025-12-31', 1800000, 'EUR', '2025-10-01', 'original', 'Q3: CFMG establishment'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2026-01-01', '2026-03-31', 1700000, 'EUR', '2026-01-01', 'original', 'Q4: Early warning systems'),
    -- Year 3 (2026-2027)
    ('a1000001-0001-4000-8000-000000000009', '1', '2026-04-01', '2026-06-30', 2000000, 'EUR', '2026-04-01', 'original', 'Q1: Expanded planting'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2026-07-01', '2026-09-30', 2000000, 'EUR', '2026-07-01', 'original', 'Q2: Aquaculture integration'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2026-10-01', '2026-12-31', 1800000, 'EUR', '2026-10-01', 'original', 'Q3: Carbon monitoring'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2027-01-01', '2027-03-31', 1700000, 'EUR', '2027-01-01', 'original', 'Q4: Mid-term evaluation'),
    -- Year 4 (2027-2028)
    ('a1000001-0001-4000-8000-000000000009', '1', '2027-04-01', '2027-06-30', 1800000, 'EUR', '2027-04-01', 'original', 'Q1: Consolidation planting'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2027-07-01', '2027-09-30', 1700000, 'EUR', '2027-07-01', 'original', 'Q2: Eco-tourism development'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2027-10-01', '2027-12-31', 1650000, 'EUR', '2027-10-01', 'original', 'Q3: Blue carbon certification'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2028-01-01', '2028-03-31', 1650000, 'EUR', '2028-01-01', 'original', 'Q4: Payment for ecosystem services'),
    -- Year 5 (2028-2029)
    ('a1000001-0001-4000-8000-000000000009', '1', '2028-04-01', '2028-06-30', 1300000, 'EUR', '2028-04-01', 'original', 'Q1: Final restoration areas'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2028-07-01', '2028-09-30', 1200000, 'EUR', '2028-07-01', 'original', 'Q2: Sustainability transition'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2028-10-01', '2028-12-31', 1100000, 'EUR', '2028-10-01', 'original', 'Q3: Impact assessment'),
    ('a1000001-0001-4000-8000-000000000009', '1', '2029-01-01', '2029-03-31', 1100000, 'EUR', '2029-01-01', 'original', 'Q4: Project closure');

-- Activity 10: Maternal and Child Cash Transfer Program (MCCT-NS)
-- Quarterly disbursements 2023-2027 (~$42M total)
INSERT INTO planned_disbursements (activity_id, type, period_start, period_end, amount, currency, value_date, status, notes)
VALUES
    -- Year 1 (2023-2024)
    ('a1000001-0001-4000-8000-000000000010', '1', '2023-07-01', '2023-09-30', 2000000, 'USD', '2023-07-01', 'original', 'Q1: Beneficiary registration'),
    ('a1000001-0001-4000-8000-000000000010', '1', '2023-10-01', '2023-12-31', 2500000, 'USD', '2023-10-01', 'original', 'Q2: Payment system setup'),
    ('a1000001-0001-4000-8000-000000000010', '1', '2024-01-01', '2024-03-31', 2500000, 'USD', '2024-01-01', 'original', 'Q3: First cash transfers'),
    ('a1000001-0001-4000-8000-000000000010', '1', '2024-04-01', '2024-06-30', 2500000, 'USD', '2024-04-01', 'original', 'Q4: Scale-up phase 1'),
    -- Year 2 (2024-2025)
    ('a1000001-0001-4000-8000-000000000010', '1', '2024-07-01', '2024-09-30', 2900000, 'USD', '2024-07-01', 'original', 'Q1: Expanded coverage'),
    ('a1000001-0001-4000-8000-000000000010', '1', '2024-10-01', '2024-12-31', 2900000, 'USD', '2024-10-01', 'original', 'Q2: Nutrition counseling'),
    ('a1000001-0001-4000-8000-000000000010', '1', '2025-01-01', '2025-03-31', 2800000, 'USD', '2025-01-01', 'original', 'Q3: Growth monitoring'),
    ('a1000001-0001-4000-8000-000000000010', '1', '2025-04-01', '2025-06-30', 2600000, 'USD', '2025-04-01', 'original', 'Q4: Mid-term evaluation'),
    -- Year 3 (2025-2026)
    ('a1000001-0001-4000-8000-000000000010', '1', '2025-07-01', '2025-09-30', 3100000, 'USD', '2025-07-01', 'original', 'Q1: Full coverage achieved'),
    ('a1000001-0001-4000-8000-000000000010', '1', '2025-10-01', '2025-12-31', 3100000, 'USD', '2025-10-01', 'original', 'Q2: Digital payments rollout'),
    ('a1000001-0001-4000-8000-000000000010', '1', '2026-01-01', '2026-03-31', 2900000, 'USD', '2026-01-01', 'original', 'Q3: Behavior change campaigns'),
    ('a1000001-0001-4000-8000-000000000010', '1', '2026-04-01', '2026-06-30', 2900000, 'USD', '2026-04-01', 'original', 'Q4: System optimization'),
    -- Year 4 (2026-2027)
    ('a1000001-0001-4000-8000-000000000010', '1', '2026-07-01', '2026-09-30', 2500000, 'USD', '2026-07-01', 'original', 'Q1: Government transition'),
    ('a1000001-0001-4000-8000-000000000010', '1', '2026-10-01', '2026-12-31', 2400000, 'USD', '2026-10-01', 'original', 'Q2: Capacity building'),
    ('a1000001-0001-4000-8000-000000000010', '1', '2027-01-01', '2027-03-31', 2200000, 'USD', '2027-01-01', 'original', 'Q3: Final transfers'),
    ('a1000001-0001-4000-8000-000000000010', '1', '2027-04-01', '2027-06-30', 2200000, 'USD', '2027-04-01', 'original', 'Q4: Impact evaluation and closure');

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Total planned disbursement records created: 176
--
-- Activities with planned disbursements:
--   1. RPSCTP (Education) - 16 quarterly disbursements (2023-2027)
--   2. MCHIP-AYR (Health) - 20 quarterly disbursements (2022-2026)
--   3. CSRVC (Agriculture) - 20 quarterly disbursements (2023-2028)
--   4. RWSSIP (WASH) - 20 quarterly disbursements (2024-2028) in AUD
--   5. RRCMAP (Infrastructure) - 20 quarterly disbursements (2022-2027)
--   6. EHADP-RKN (Humanitarian) - 8 quarterly disbursements (2024-2025)
--   7. LGPASP (Governance) - 20 quarterly disbursements (2023-2027)
--   8. WEEMST (Livelihoods) - 20 quarterly disbursements (2023-2028)
--   9. CMRCCR (Environment) - 20 quarterly disbursements (2024-2029) in EUR
--   10. MCCT-NS (Social Protection) - 16 quarterly disbursements (2023-2027)
--
-- Total planned value: ~$350M+ across all activities
--
-- IMPORTANT: After running this script, trigger USD conversion:
--   curl -X POST http://localhost:3000/api/planned-disbursements/backfill-usd
-- ============================================================================
