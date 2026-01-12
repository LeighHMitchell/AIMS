-- Update budget status for Myanmar activities with realistic variety

-- On-budget: Government-aligned infrastructure and governance projects
UPDATE activities SET
  budget_status = 'on_budget',
  budget_status_notes = 'Fully integrated into national development budget. Project aligns with Ministry of Education priorities.',
  budget_status_updated_at = NOW()
WHERE id = 'a1000001-0001-4000-8000-000000000001'; -- RPSCTP (Education)

UPDATE activities SET
  budget_status = 'on_budget',
  budget_status_notes = 'Incorporated into Ministry of Construction infrastructure allocation. Coordinated with regional development plans.',
  budget_status_updated_at = NOW()
WHERE id = 'a1000001-0001-4000-8000-000000000005'; -- RRCMAP (Infrastructure)

UPDATE activities SET
  budget_status = 'on_budget',
  budget_status_notes = 'Part of decentralization reform budget. Co-financed with Union Government.',
  budget_status_updated_at = NOW()
WHERE id = 'a1000001-0001-4000-8000-000000000007'; -- LGPASP (Governance)

-- Partial: Projects with some government budget alignment
UPDATE activities SET
  budget_status = 'partial',
  budget_status_notes = 'Ministry of Health contributes staff salaries and facility costs. External funding covers medicines and equipment.',
  budget_status_updated_at = NOW()
WHERE id = 'a1000001-0001-4000-8000-000000000002'; -- MCHIP-AYR (Health)

UPDATE activities SET
  budget_status = 'partial',
  budget_status_notes = 'State/Region governments provide counterpart funding for community contributions. Core activities externally funded.',
  budget_status_updated_at = NOW()
WHERE id = 'a1000001-0001-4000-8000-000000000004'; -- RWSSIP (WASH)

-- Off-budget: Humanitarian and NGO-led projects
UPDATE activities SET
  budget_status = 'off_budget',
  budget_status_notes = 'Emergency humanitarian response. Operates independently of government budget systems due to access constraints.',
  budget_status_updated_at = NOW()
WHERE id = 'a1000001-0001-4000-8000-000000000006'; -- EHADP-RKN (Humanitarian)

UPDATE activities SET
  budget_status = 'off_budget',
  budget_status_notes = 'NGO-implemented programme. Not captured in government budget tracking systems.',
  budget_status_updated_at = NOW()
WHERE id = 'a1000001-0001-4000-8000-000000000008'; -- WEEMST (Women's Empowerment)

UPDATE activities SET
  budget_status = 'off_budget',
  budget_status_notes = 'Humanitarian cash transfer programme. Operates through parallel delivery mechanisms.',
  budget_status_updated_at = NOW()
WHERE id = 'a1000001-0001-4000-8000-000000000010'; -- MCCT-NS (Social Protection)

-- Unknown: Newer projects pending budget classification
UPDATE activities SET
  budget_status = 'unknown',
  budget_status_notes = 'Budget alignment under discussion with Ministry of Agriculture. Classification pending.',
  budget_status_updated_at = NOW()
WHERE id = 'a1000001-0001-4000-8000-000000000003'; -- CSRVC (Agriculture)

UPDATE activities SET
  budget_status = 'unknown',
  budget_status_notes = 'Multi-ministry project. Budget classification requires inter-ministerial coordination.',
  budget_status_updated_at = NOW()
WHERE id = 'a1000001-0001-4000-8000-000000000009'; -- CMRCCR (Environment)
