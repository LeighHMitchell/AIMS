-- Test Data for Linked Activities Feature
-- This script creates sample activities and relationships for testing

-- Sample Activities (assuming these don't exist)
-- You should adjust the IDs and organization references based on your actual data

-- Scenario 1: Multi-Donor Trust Fund (MDTF)
-- World Bank MDTF as the parent, with multiple donor contributions

-- Create sample MDTF activity (if not exists)
DO $$ 
BEGIN
    -- Parent MDTF Activity
    IF NOT EXISTS (SELECT 1 FROM activities WHERE iati_id = 'XM-DAC-41114-MDTF-001') THEN
        INSERT INTO activities (
            id, 
            iati_id, 
            title, 
            description, 
            activity_status,
            publication_status,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'XM-DAC-41114-MDTF-001',
            'World Bank Multi-Donor Trust Fund for Education',
            'A pooled funding mechanism supporting education initiatives',
            'active',
            'published',
            NOW()
        );
    END IF;

    -- DFAT Contribution
    IF NOT EXISTS (SELECT 1 FROM activities WHERE iati_id = 'AU-5-EDU-2024-001') THEN
        INSERT INTO activities (
            id, 
            iati_id, 
            title, 
            description, 
            activity_status,
            publication_status,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'AU-5-EDU-2024-001',
            'DFAT Contribution to Education MDTF',
            'Australian contribution to the World Bank education trust fund',
            'active',
            'published',
            NOW()
        );
    END IF;

    -- EU Contribution
    IF NOT EXISTS (SELECT 1 FROM activities WHERE iati_id = 'XI-IATI-EC_INTPA-2024-EDU-01') THEN
        INSERT INTO activities (
            id, 
            iati_id, 
            title, 
            description, 
            activity_status,
            publication_status,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'XI-IATI-EC_INTPA-2024-EDU-01',
            'EU Support to Education MDTF',
            'European Union contribution to education initiatives',
            'active',
            'published',
            NOW()
        );
    END IF;
END $$;

-- Scenario 2: Parent-Child Programme Structure
DO $$ 
BEGIN
    -- Parent Programme
    IF NOT EXISTS (SELECT 1 FROM activities WHERE iati_id = 'GB-GOV-1-HEALTH-PROG-001') THEN
        INSERT INTO activities (
            id, 
            iati_id, 
            title, 
            description, 
            activity_status,
            publication_status,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'GB-GOV-1-HEALTH-PROG-001',
            'National Health System Strengthening Programme',
            'Umbrella programme for health system improvements',
            'active',
            'published',
            NOW()
        );
    END IF;

    -- Child Project 1
    IF NOT EXISTS (SELECT 1 FROM activities WHERE iati_id = 'GB-GOV-1-HEALTH-PROJ-NR-001') THEN
        INSERT INTO activities (
            id, 
            iati_id, 
            title, 
            description, 
            activity_status,
            publication_status,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'GB-GOV-1-HEALTH-PROJ-NR-001',
            'Northern Region Health Facilities Upgrade',
            'Upgrading health facilities in the northern region',
            'active',
            'published',
            NOW()
        );
    END IF;

    -- Child Project 2
    IF NOT EXISTS (SELECT 1 FROM activities WHERE iati_id = 'GB-GOV-1-HEALTH-PROJ-SR-001') THEN
        INSERT INTO activities (
            id, 
            iati_id, 
            title, 
            description, 
            activity_status,
            publication_status,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'GB-GOV-1-HEALTH-PROJ-SR-001',
            'Southern Region Health Worker Training',
            'Training programme for health workers in the south',
            'active',
            'published',
            NOW()
        );
    END IF;
END $$;

-- Scenario 3: Co-funded Infrastructure Project
DO $$ 
BEGIN
    -- ADB Infrastructure Project
    IF NOT EXISTS (SELECT 1 FROM activities WHERE iati_id = 'XM-DAC-46004-INFRA-2024-001') THEN
        INSERT INTO activities (
            id, 
            iati_id, 
            title, 
            description, 
            activity_status,
            publication_status,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'XM-DAC-46004-INFRA-2024-001',
            'ADB Rural Road Infrastructure Project',
            'Asian Development Bank funded rural road construction',
            'active',
            'published',
            NOW()
        );
    END IF;

    -- EU Co-funding
    IF NOT EXISTS (SELECT 1 FROM activities WHERE iati_id = 'XI-IATI-EC_INTPA-2024-INFRA-01') THEN
        INSERT INTO activities (
            id, 
            iati_id, 
            title, 
            description, 
            activity_status,
            publication_status,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'XI-IATI-EC_INTPA-2024-INFRA-01',
            'EU Co-financing for Rural Infrastructure',
            'EU contribution to rural road development',
            'active',
            'published',
            NOW()
        );
    END IF;
END $$;

-- Create Sample Relationships
-- Note: These will only work after the activities are created above

-- Link MDTF contributions (type 4 = co-funded)
INSERT INTO related_activities (
    source_activity_id,
    linked_activity_id,
    iati_identifier,
    relationship_type,
    is_external,
    created_at
)
SELECT 
    donor.id as source_activity_id,
    mdtf.id as linked_activity_id,
    mdtf.iati_id,
    '4'::related_activity_type,
    false,
    NOW()
FROM activities donor
CROSS JOIN activities mdtf
WHERE donor.iati_id IN ('AU-5-EDU-2024-001', 'XI-IATI-EC_INTPA-2024-EDU-01')
  AND mdtf.iati_id = 'XM-DAC-41114-MDTF-001'
  AND NOT EXISTS (
    SELECT 1 FROM related_activities ra 
    WHERE ra.source_activity_id = donor.id 
      AND ra.linked_activity_id = mdtf.id
  );

-- Link Parent-Child relationships
-- Parent to Children (type 1 = parent)
INSERT INTO related_activities (
    source_activity_id,
    linked_activity_id,
    iati_identifier,
    relationship_type,
    is_external,
    created_at
)
SELECT 
    parent.id as source_activity_id,
    child.id as linked_activity_id,
    child.iati_id,
    '1'::related_activity_type,
    false,
    NOW()
FROM activities parent
CROSS JOIN activities child
WHERE parent.iati_id = 'GB-GOV-1-HEALTH-PROG-001'
  AND child.iati_id IN ('GB-GOV-1-HEALTH-PROJ-NR-001', 'GB-GOV-1-HEALTH-PROJ-SR-001')
  AND NOT EXISTS (
    SELECT 1 FROM related_activities ra 
    WHERE ra.source_activity_id = parent.id 
      AND ra.linked_activity_id = child.id
  );

-- Children to Parent (type 2 = child)
INSERT INTO related_activities (
    source_activity_id,
    linked_activity_id,
    iati_identifier,
    relationship_type,
    is_external,
    created_at
)
SELECT 
    child.id as source_activity_id,
    parent.id as linked_activity_id,
    parent.iati_id,
    '2'::related_activity_type,
    false,
    NOW()
FROM activities child
CROSS JOIN activities parent
WHERE child.iati_id IN ('GB-GOV-1-HEALTH-PROJ-NR-001', 'GB-GOV-1-HEALTH-PROJ-SR-001')
  AND parent.iati_id = 'GB-GOV-1-HEALTH-PROG-001'
  AND NOT EXISTS (
    SELECT 1 FROM related_activities ra 
    WHERE ra.source_activity_id = child.id 
      AND ra.linked_activity_id = parent.id
  );

-- Siblings to each other (type 3 = sibling)
INSERT INTO related_activities (
    source_activity_id,
    linked_activity_id,
    iati_identifier,
    relationship_type,
    is_external,
    created_at
)
SELECT 
    a1.id as source_activity_id,
    a2.id as linked_activity_id,
    a2.iati_id,
    '3'::related_activity_type,
    false,
    NOW()
FROM activities a1
CROSS JOIN activities a2
WHERE a1.iati_id = 'GB-GOV-1-HEALTH-PROJ-NR-001'
  AND a2.iati_id = 'GB-GOV-1-HEALTH-PROJ-SR-001'
  AND NOT EXISTS (
    SELECT 1 FROM related_activities ra 
    WHERE ra.source_activity_id = a1.id 
      AND ra.linked_activity_id = a2.id
  );

-- Co-funded projects linking to each other (type 4)
INSERT INTO related_activities (
    source_activity_id,
    linked_activity_id,
    iati_identifier,
    relationship_type,
    is_external,
    created_at
)
SELECT 
    adb.id as source_activity_id,
    eu.id as linked_activity_id,
    eu.iati_id,
    '4'::related_activity_type,
    false,
    NOW()
FROM activities adb
CROSS JOIN activities eu
WHERE adb.iati_id = 'XM-DAC-46004-INFRA-2024-001'
  AND eu.iati_id = 'XI-IATI-EC_INTPA-2024-INFRA-01'
  AND NOT EXISTS (
    SELECT 1 FROM related_activities ra 
    WHERE ra.source_activity_id = adb.id 
      AND ra.linked_activity_id = eu.id
  );

-- Add example of external activity link (type 5 = third party)
INSERT INTO related_activities (
    source_activity_id,
    linked_activity_id,
    iati_identifier,
    relationship_type,
    is_external,
    created_at
)
SELECT 
    a.id as source_activity_id,
    NULL as linked_activity_id,
    'XM-DAC-UNDP-EXT-2024-001',
    '5'::related_activity_type,
    true,
    NOW()
FROM activities a
WHERE a.iati_id = 'AU-5-EDU-2024-001'
  AND NOT EXISTS (
    SELECT 1 FROM related_activities ra 
    WHERE ra.source_activity_id = a.id 
      AND ra.iati_identifier = 'XM-DAC-UNDP-EXT-2024-001'
  )
LIMIT 1;

-- Sample transactions for testing linked transactions view
-- Add transactions to some of the test activities
DO $$
DECLARE
    act RECORD;
BEGIN
    -- Add sample transactions to each test activity
    FOR act IN SELECT id, iati_id FROM activities 
               WHERE iati_id IN (
                   'AU-5-EDU-2024-001',
                   'XI-IATI-EC_INTPA-2024-EDU-01',
                   'GB-GOV-1-HEALTH-PROJ-NR-001',
                   'GB-GOV-1-HEALTH-PROJ-SR-001'
               )
    LOOP
        -- Add commitment transaction
        INSERT INTO transactions (
            uuid, activity_id, transaction_type, value, currency,
            transaction_date, provider_org_name, receiver_org_name,
            description, status
        )
        SELECT 
            gen_random_uuid(),
            act.id,
            '2', -- Outgoing Commitment
            CASE 
                WHEN act.iati_id LIKE 'AU-%' THEN 5000000
                WHEN act.iati_id LIKE 'XI-%' THEN 8000000
                ELSE 2000000
            END,
            'USD',
            CURRENT_DATE - INTERVAL '6 months',
            CASE 
                WHEN act.iati_id LIKE 'AU-%' THEN 'Australian DFAT'
                WHEN act.iati_id LIKE 'XI-%' THEN 'European Commission'
                ELSE 'UK FCDO'
            END,
            'Ministry of Finance',
            'Initial commitment for ' || act.iati_id,
            'actual'
        WHERE NOT EXISTS (
            SELECT 1 FROM transactions 
            WHERE activity_id = act.id 
              AND transaction_type = '2'
        );
        
        -- Add disbursement transaction
        INSERT INTO transactions (
            uuid, activity_id, transaction_type, value, currency,
            transaction_date, provider_org_name, receiver_org_name,
            description, status
        )
        SELECT 
            gen_random_uuid(),
            act.id,
            '3', -- Disbursement
            CASE 
                WHEN act.iati_id LIKE 'AU-%' THEN 1000000
                WHEN act.iati_id LIKE 'XI-%' THEN 2000000
                ELSE 500000
            END,
            'USD',
            CURRENT_DATE - INTERVAL '2 months',
            CASE 
                WHEN act.iati_id LIKE 'AU-%' THEN 'Australian DFAT'
                WHEN act.iati_id LIKE 'XI-%' THEN 'European Commission'
                ELSE 'UK FCDO'
            END,
            'Implementation Partner',
            'First disbursement for ' || act.iati_id,
            'actual'
        WHERE NOT EXISTS (
            SELECT 1 FROM transactions 
            WHERE activity_id = act.id 
              AND transaction_type = '3'
        );
    END LOOP;
END $$;

-- View test results
SELECT 
    'Test Activities Created' as status,
    COUNT(*) as count
FROM activities
WHERE iati_id IN (
    'XM-DAC-41114-MDTF-001',
    'AU-5-EDU-2024-001',
    'XI-IATI-EC_INTPA-2024-EDU-01',
    'GB-GOV-1-HEALTH-PROG-001',
    'GB-GOV-1-HEALTH-PROJ-NR-001',
    'GB-GOV-1-HEALTH-PROJ-SR-001',
    'XM-DAC-46004-INFRA-2024-001',
    'XI-IATI-EC_INTPA-2024-INFRA-01'
)
UNION ALL
SELECT 
    'Related Activities Created',
    COUNT(*)
FROM related_activities_with_details
UNION ALL
SELECT 
    'Test Transactions Created',
    COUNT(*)
FROM transactions t
JOIN activities a ON t.activity_id = a.id
WHERE a.iati_id IN (
    'AU-5-EDU-2024-001',
    'XI-IATI-EC_INTPA-2024-EDU-01',
    'GB-GOV-1-HEALTH-PROJ-NR-001',
    'GB-GOV-1-HEALTH-PROJ-SR-001'
); 