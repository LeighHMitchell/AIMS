-- Seed script to fill out the "Description - Other" (IATI Type 4) field
-- for the 10 most recently updated activities

-- Using CTE approach (window functions not allowed directly in UPDATE)
WITH ranked_activities AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY updated_at DESC) as rn
    FROM activities
    LIMIT 10
),
descriptions AS (
    SELECT * FROM (VALUES
        (1, 'This activity aligns with the national development strategy and contributes to the government''s five-year development plan. Implementation follows a phased approach with quarterly milestones and regular stakeholder consultations. The activity incorporates lessons learned from previous interventions in the region.'),
        (2, 'Cross-cutting themes include gender mainstreaming, environmental sustainability, and capacity building for local institutions. The activity complements ongoing initiatives by other development partners and is coordinated through the sector working group mechanism.'),
        (3, 'Risk mitigation measures include regular monitoring visits, third-party verification, and adaptive management approaches. The activity builds on successful pilot programs and incorporates feedback from community consultations conducted during the design phase.'),
        (4, 'Sustainability mechanisms include training of trainers programs, establishment of revolving funds, and integration with existing government systems. Exit strategy involves gradual handover to local authorities with continued technical support during the transition period.'),
        (5, 'Innovation components include digital tools for monitoring and evaluation, mobile-based feedback mechanisms, and data-driven decision making. The activity serves as a learning platform for scaling successful approaches to other regions.'),
        (6, 'Partnership arrangements include memoranda of understanding with line ministries, collaboration agreements with civil society organizations, and coordination with UN agencies operating in the same geographic area.'),
        (7, 'Quality assurance measures include independent evaluations, beneficiary satisfaction surveys, and compliance audits. The activity adheres to international standards and best practices in the sector.'),
        (8, 'Climate resilience considerations are integrated throughout the activity design. Environmental and social safeguards follow international standards with grievance redress mechanisms in place for affected communities.'),
        (9, 'Knowledge management activities include documentation of best practices, case studies, and contribution to sector-wide learning. Findings are shared through national and regional platforms.'),
        (10, 'Coordination mechanisms include participation in donor coordination meetings, joint field visits with other partners, and alignment with the national aid management information system for improved transparency.')
    ) AS t(rn, description)
)
UPDATE activities a
SET
    description_other = d.description,
    updated_at = NOW()
FROM ranked_activities ra
JOIN descriptions d ON ra.rn = d.rn
WHERE a.id = ra.id;

-- Verify the results
SELECT
    id,
    LEFT(title_narrative, 40) AS title,
    LEFT(description_other, 60) AS description_other_preview,
    LENGTH(description_other) AS description_length,
    updated_at
FROM activities
WHERE description_other IS NOT NULL AND description_other != ''
ORDER BY updated_at DESC
LIMIT 10;
