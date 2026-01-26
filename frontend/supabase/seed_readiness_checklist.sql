-- Seed Data for Government Readiness Checklist
-- Generic checklist items based on international best practices for aid project preparation

-- Clear existing data (if re-seeding)
-- TRUNCATE readiness_checklist_items, readiness_checklist_templates CASCADE;

-- ============================================
-- STAGE 1: Pre-Proposal Submission
-- ============================================
INSERT INTO readiness_checklist_templates (code, name, description, stage_order, is_active)
VALUES (
    'PRE_PROPOSAL',
    'Pre-Proposal Submission',
    'Requirements before submitting the project proposal to the Ministry of Finance or relevant coordinating body',
    1,
    true
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    stage_order = EXCLUDED.stage_order;

-- Stage 1 Items
INSERT INTO readiness_checklist_items (template_id, code, title, description, guidance_text, responsible_agency_type, display_order, is_required, applicable_conditions)
SELECT t.id, i.code, i.title, i.description, i.guidance_text, i.responsible_agency_type, i.display_order, i.is_required, i.applicable_conditions::jsonb
FROM readiness_checklist_templates t
CROSS JOIN (VALUES
    ('CONCEPT_NOTE', 'Concept Note Prepared', 
     'A project concept note must be prepared outlining the project rationale, needs analysis, expected outcomes, project activities, estimated cost and time, implementing agency(ies), coordination mechanism, innovations, and best practices.',
     'Upload the concept note document. Ensure it includes: problem statement, proposed solution, target beneficiaries, implementation approach, budget estimate, and timeline.',
     'Implementing Agency', 1, true, '{}'),
    
    ('FEASIBILITY_STUDY', 'Feasibility Study Completed', 
     'Pre-feasibility or feasibility study has been conducted as required for the project type and scale.',
     'For large infrastructure projects, a full feasibility study is typically required. For smaller projects, a pre-feasibility assessment may suffice.',
     'Implementing Agency', 2, false, '{"is_infrastructure": true}'),
    
    ('PREPARATION_WORKPLAN', 'Project Preparation Work Plan Attached', 
     'A detailed work plan for project preparation activities has been developed and attached.',
     'The work plan should outline key milestones, responsible parties, and timelines for all preparatory activities.',
     'Implementing Agency', 3, true, '{}')
    
) AS i(code, title, description, guidance_text, responsible_agency_type, display_order, is_required, applicable_conditions)
WHERE t.code = 'PRE_PROPOSAL'
ON CONFLICT (template_id, code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    guidance_text = EXCLUDED.guidance_text,
    responsible_agency_type = EXCLUDED.responsible_agency_type,
    display_order = EXCLUDED.display_order,
    is_required = EXCLUDED.is_required,
    applicable_conditions = EXCLUDED.applicable_conditions;

-- ============================================
-- STAGE 2: Pre-Development Partner Submission
-- ============================================
INSERT INTO readiness_checklist_templates (code, name, description, stage_order, is_active)
VALUES (
    'PRE_DP_SUBMISSION',
    'Pre-Development Partner Submission',
    'Requirements before submitting the project proposal to the development partner',
    2,
    true
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    stage_order = EXCLUDED.stage_order;

-- Stage 2 Items
INSERT INTO readiness_checklist_items (template_id, code, title, description, guidance_text, responsible_agency_type, display_order, is_required, applicable_conditions)
SELECT t.id, i.code, i.title, i.description, i.guidance_text, i.responsible_agency_type, i.display_order, i.is_required, i.applicable_conditions::jsonb
FROM readiness_checklist_templates t
CROSS JOIN (VALUES
    ('PRC_APPROVAL', 'Project Recommendation Committee Approval', 
     'The project has been approved by the Project Recommendation Committee or equivalent government approval body.',
     'Upload the approval letter or minutes from the committee meeting.',
     'Ministry of Finance', 1, true, '{}'),
    
    ('CABINET_APPROVAL_LOAN', 'Cabinet/Council of Ministers Approval for Special Loans', 
     'For loans with procurement-tied conditions and non-concessional loans, prior approval of the Council of Ministers has been obtained.',
     'This is required for tied loans, non-concessional financing, and other special lending arrangements.',
     'Ministry of Finance', 2, true, '{"financing_type": ["loan"]}'),
    
    ('LEGAL_FRAMEWORK_REVIEW', 'Legal and Regulatory Framework Review', 
     'Review of any legal or regulatory requirements specific to the project has been completed.',
     'Identify any laws, regulations, or policies that may affect project implementation.',
     'Implementing Agency', 3, false, '{}')
    
) AS i(code, title, description, guidance_text, responsible_agency_type, display_order, is_required, applicable_conditions)
WHERE t.code = 'PRE_DP_SUBMISSION'
ON CONFLICT (template_id, code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    guidance_text = EXCLUDED.guidance_text,
    responsible_agency_type = EXCLUDED.responsible_agency_type,
    display_order = EXCLUDED.display_order,
    is_required = EXCLUDED.is_required,
    applicable_conditions = EXCLUDED.applicable_conditions;

-- ============================================
-- STAGE 3: Pre-Appraisal / Fact-Finding
-- ============================================
INSERT INTO readiness_checklist_templates (code, name, description, stage_order, is_active)
VALUES (
    'PRE_APPRAISAL',
    'Pre-Appraisal / Fact-Finding',
    'Requirements before the appraisal or fact-finding mission by the development partner',
    3,
    true
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    stage_order = EXCLUDED.stage_order;

-- Stage 3 Items
INSERT INTO readiness_checklist_items (template_id, code, title, description, guidance_text, responsible_agency_type, display_order, is_required, applicable_conditions)
SELECT t.id, i.code, i.title, i.description, i.guidance_text, i.responsible_agency_type, i.display_order, i.is_required, i.applicable_conditions::jsonb
FROM readiness_checklist_templates t
CROSS JOIN (VALUES
    ('DETAILED_STUDY_REPORT', 'Detailed Project Study Report Prepared', 
     'A detailed project study report and activity-wise project description have been prepared.',
     'The report should include detailed technical specifications, cost estimates, and implementation methodology.',
     'Implementing Agency', 1, true, '{}'),
    
    ('IMPLEMENTATION_STRUCTURE', 'Implementation Structure and Fund Flow Defined', 
     'Project implementation structure and fund flow arrangements have been clarified.',
     'Define the organizational structure, roles, responsibilities, and how funds will flow from the financing source to implementing units.',
     'Implementing Agency', 2, true, '{}'),
    
    ('COFINANCING_AGREEMENTS', 'Co-financing Agreements Obtained', 
     'Agreement has been obtained from all co-financing development partners as applicable.',
     'For multi-donor projects, confirmation letters or agreements from all co-financiers should be attached.',
     'Ministry of Finance', 3, false, '{}'),
    
    ('KEY_PERSONNEL_IDENTIFIED', 'Key Personnel Identified', 
     'Positions within the Project Implementation Unit (PIU) have been proposed, and key personnel (Project Director, Procurement Specialist, Financial Management Specialist, Safeguard Specialist) have been identified.',
     'Provide names and qualifications of proposed key personnel, or a timeline for their recruitment.',
     'Implementing Agency', 4, true, '{}'),
    
    ('ECONOMIC_FINANCIAL_ANALYSIS', 'Economic and Financial Analysis Completed', 
     'Detailed economic, technical, social, and financial analyses have been carried out as applicable. Financing arrangements (sources, annual needs, repayment period), financial analysis (cost-benefit ratio, FIRR, EIRR, NPV, etc.) have been documented.',
     'Include all relevant financial indicators and assumptions used in the analysis.',
     'Implementing Agency', 5, true, '{}'),
    
    ('ENVIRONMENTAL_ASSESSMENT', 'Environmental Assessment Completed', 
     'Environmental assessment has been completed, approved by relevant authorities, and agreed upon with development partners.',
     'Upload the Environmental Impact Assessment (EIA) or Initial Environmental Examination (IEE) as applicable.',
     'Implementing Agency', 6, true, '{"is_infrastructure": true}'),
    
    ('ENVIRONMENTAL_MGMT_PLAN', 'Environmental Management Plan Prepared', 
     'Environmental Management Plan (EMP) has been prepared.',
     'The EMP should detail mitigation measures, monitoring requirements, and institutional arrangements.',
     'Implementing Agency', 7, false, '{"is_infrastructure": true}'),
    
    ('PROCUREMENT_PLAN', 'Detailed Procurement Plan Prepared', 
     'Detailed procurement plan including number of contract packages, description, procurement methods, decision-making flowchart, and timelines has been proposed.',
     'Use the standard procurement plan template and include all major procurement packages.',
     'Implementing Agency', 8, true, '{}'),
    
    ('CONSULTANT_TOR', 'Consultant Terms of Reference Prepared', 
     'Terms of Reference (ToR) for consultants, including PIU consultants, pre-qualification requirements, procurement method, etc., have been agreed upon with the development partner.',
     'ToRs should clearly define scope, qualifications, deliverables, and evaluation criteria.',
     'Implementing Agency', 9, true, '{}'),
    
    ('TECHNICAL_EVALUATION_CRITERIA', 'Technical Evaluation Criteria Prepared', 
     'Technical evaluation criteria for consultant selection have been prepared.',
     'Ensure criteria align with development partner requirements and best practices.',
     'Implementing Agency', 10, false, '{}'),
    
    ('LAND_ACQUISITION_PLAN', 'Land Acquisition and Resettlement Plans Prepared', 
     'Land acquisition and resettlement plans have been prepared as applicable.',
     'Include Resettlement Action Plan (RAP) or Abbreviated RAP as required by project scale.',
     'Implementing Agency', 11, true, '{"is_infrastructure": true}'),
    
    ('LAND_BUDGET_30PCT', 'Budget for Land Acquisition (30%) Provisioned', 
     'At least 30% of the required budget for land acquisition/resettlement has been provisioned or financing assurance obtained; preparatory activities for land acquisition/construction have initiated.',
     'Provide budget allocation documentation or financing assurance letters.',
     'Implementing Agency', 12, true, '{"is_infrastructure": true}'),
    
    ('COUNTERPART_FUNDING', 'Counterpart Funding Arrangements Ensured', 
     'Provision of additional funds beyond development partner financing has been ensured as required.',
     'Document government counterpart funding commitments and sources.',
     'Ministry of Finance', 13, false, '{}'),
    
    -- Results-Based Financing specific items
    ('RBF_TARGETS_ESTIMATES', 'Programme Targets and Cost Estimates Prepared', 
     'Expected programme targets and cost estimates have been prepared.',
     'For Results-Based Financing, clearly define expected outputs and associated costs.',
     'Implementing Agency', 14, true, '{"modality": ["results_based"]}'),
    
    ('RBF_DLI_PREPARED', 'Disbursement-Linked Indicators Prepared', 
     'Disbursement-Linked Indicators (DLIs), verification protocol, and programme action plan have been prepared.',
     'DLIs should be measurable, achievable, and directly linked to disbursement tranches.',
     'Implementing Agency', 15, true, '{"modality": ["results_based"]}'),
    
    ('RBF_IVA_TOR', 'Independent Verification Agency ToR Prepared', 
     'Terms of Reference for the independent verification agency has been prepared.',
     'The IVA ToR should define verification methodology, reporting requirements, and timeline.',
     'Implementing Agency', 16, true, '{"modality": ["results_based"]}'),
    
    -- Budgetary Support specific items
    ('BS_POLICY_FRAMEWORK', 'Policy Reform Framework Drafted', 
     'Policy reform framework and action plan drafted and recommended by the Project Recommendation Committee.',
     'For budgetary support operations, clearly define policy reform milestones.',
     'Ministry of Finance', 17, true, '{"modality": ["budgetary_support"]}'),
    
    ('BS_TA_TOR', 'Technical Assistance ToR Drafted', 
     'Terms of Reference for technical assistance (if applicable) have been drafted.',
     'TA ToR should support implementation of policy reforms.',
     'Ministry of Finance', 18, false, '{"modality": ["budgetary_support"]}'),
    
    -- Project Preparation specific items
    ('PP_SCOPE_TOR', 'Project Preparation Scope and ToR Prepared', 
     'Scope of project preparation and Terms of Reference for consultants have been prepared.',
     'For project preparation financing, define what studies and activities will be conducted.',
     'Implementing Agency', 19, true, '{"modality": ["project_preparation"]}'),
    
    ('PP_INSTITUTIONAL_ARRANGEMENT', 'Institutional Arrangement Established', 
     'Institutional arrangement has been established for implementation of project preparation activities.',
     'Define the team structure and coordination mechanisms for preparation phase.',
     'Implementing Agency', 20, true, '{"modality": ["project_preparation"]}')
    
) AS i(code, title, description, guidance_text, responsible_agency_type, display_order, is_required, applicable_conditions)
WHERE t.code = 'PRE_APPRAISAL'
ON CONFLICT (template_id, code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    guidance_text = EXCLUDED.guidance_text,
    responsible_agency_type = EXCLUDED.responsible_agency_type,
    display_order = EXCLUDED.display_order,
    is_required = EXCLUDED.is_required,
    applicable_conditions = EXCLUDED.applicable_conditions;

-- ============================================
-- STAGE 4: Pre-Negotiation
-- ============================================
INSERT INTO readiness_checklist_templates (code, name, description, stage_order, is_active)
VALUES (
    'PRE_NEGOTIATION',
    'Pre-Negotiation',
    'Requirements before entering into formal negotiations with the development partner',
    4,
    true
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    stage_order = EXCLUDED.stage_order;

-- Stage 4 Items
INSERT INTO readiness_checklist_items (template_id, code, title, description, guidance_text, responsible_agency_type, display_order, is_required, applicable_conditions)
SELECT t.id, i.code, i.title, i.description, i.guidance_text, i.responsible_agency_type, i.display_order, i.is_required, i.applicable_conditions::jsonb
FROM readiness_checklist_templates t
CROSS JOIN (VALUES
    ('IMPLEMENTATION_MANUAL', 'Project Implementation Manual Prepared', 
     'Project Implementation Plan/Administration Manual/Memo (including scope, implementation structure, procurement, budget, disbursement, reporting, audit) has been prepared.',
     'The manual should serve as a comprehensive guide for all project implementation procedures.',
     'Implementing Agency', 1, true, '{}'),
    
    ('LAND_ACQUISITION_30PCT_COMPLETE', 'Land Acquisition Progress (30%)', 
     'At least 30% of required land acquisition has been completed and assurance obtained for remaining land.',
     'Provide documentation showing land acquisition progress and commitment for remaining parcels.',
     'Implementing Agency', 2, true, '{"is_infrastructure": true}'),
    
    ('UTILITIES_RELOCATION', 'Utilities Relocation Assurance Obtained', 
     'Assurance for relocation of electricity, telephone, water, sewerage, or other utilities has been obtained.',
     'Include letters or agreements from utility companies confirming relocation commitments.',
     'Implementing Agency', 3, false, '{"is_infrastructure": true}'),
    
    ('RESETTLEMENT_ALIGNED', 'Resettlement Plan Aligned with Procurement', 
     'Resettlement and rehabilitation plan aligned with procurement plan has been prepared.',
     'Ensure resettlement activities are sequenced appropriately with construction contracts.',
     'Implementing Agency', 4, false, '{"is_infrastructure": true}'),
    
    ('CONSULTANT_MOBILIZATION_READY', 'Consultant Mobilization Preparations Complete', 
     'Preparations completed for consultant mobilization if applicable for implementation.',
     'This includes draft contracts, office space, and other logistics.',
     'Implementing Agency', 5, false, '{}'),
    
    ('FOREST_LAND_APPROVAL', 'Forest Land Use Approval Obtained', 
     'Approval obtained for forest land use if applicable.',
     'For projects requiring forest clearance, attach approval from the relevant forestry authority.',
     'Implementing Agency', 6, false, '{"is_infrastructure": true}'),
    
    ('SUBNATIONAL_APPROVALS', 'Subnational Government Approvals Obtained', 
     'For projects proposed by Provinces or Local Levels, approval obtained from the Provincial Council of Ministers or Local Executive, respectively.',
     'Attach approval letters from relevant subnational authorities.',
     'Implementing Agency', 7, false, '{}'),
    
    ('CONTRACT_DOCS_30PCT', 'Contract Documents Prepared (30%)', 
     'For construction-related projects, contract documents amounting to at least 30% of project cost have been prepared and agreed upon by the development partner.',
     'Include bidding documents that are ready for procurement.',
     'Implementing Agency', 8, true, '{"is_infrastructure": true}'),
    
    ('ME_FRAMEWORK', 'M&E Framework Prepared', 
     'Project monitoring and evaluation framework has been prepared.',
     'Include results framework, key performance indicators, data collection methodology, and reporting schedule.',
     'Implementing Agency', 9, true, '{}'),
    
    ('BUDGET_ALLOCATED', 'Current Year Budget Allocated', 
     'Required budget for the current fiscal year has been allocated or financing ensured.',
     'Attach budget allocation documentation or financing commitment letters.',
     'Ministry of Finance', 10, true, '{}'),
    
    ('SUBSIDIARY_LOAN_DRAFT', 'Subsidiary Loan Agreement Draft Prepared', 
     'Draft subsidiary loan agreement (if applicable) has been prepared and agreed.',
     'For on-lending arrangements, the subsidiary agreement defines terms between government and implementing entity.',
     'Ministry of Finance', 11, false, '{"financing_type": ["loan"]}'),
    
    ('NPB_REGISTRATION', 'Project Registered in National Project Bank', 
     'Project has been registered in the National Project Bank or equivalent national project database.',
     'Provide the registration number or confirmation of entry.',
     'Ministry of Finance', 12, true, '{}'),
    
    ('FINANCING_AGREEMENT_DRAFT', 'Financing Agreement Draft Prepared', 
     'Financing agreement has been drafted.',
     'The draft should be reviewed by all parties before negotiation.',
     'Ministry of Finance', 13, true, '{}'),
    
    ('NEGOTIATION_AUTHORIZATION', 'Negotiation Authorization Received', 
     'Negotiation authorization has been received from the Council of Ministers or appropriate authority.',
     'Attach the authorization letter or cabinet decision.',
     'Ministry of Finance', 14, true, '{}'),
    
    -- Results-Based Financing specific
    ('RBF_IVA_AGREEMENT_DRAFT', 'Independent Verification Agency Agreement Draft Prepared', 
     'Draft agreement prepared for engaging the independent verification agency.',
     'The agreement should define verification methodology, timeline, and payment terms.',
     'Implementing Agency', 15, true, '{"modality": ["results_based"]}'),
    
    -- Budgetary Support specific
    ('BS_REFORM_EVIDENCE', 'Policy Reform Evidence Submitted', 
     'Evidence that agreed reform actions have been completed and submitted to the Ministry of Finance.',
     'Compile documentation demonstrating completion of prior actions.',
     'Line Ministry', 16, true, '{"modality": ["budgetary_support"]}'),
    
    ('BS_REFORM_FORWARDED', 'Policy Reform Evidence Forwarded to Development Partner', 
     'Evidence and a letter related to policy reform forwarded to development partner.',
     'Official transmission of reform evidence to trigger disbursement consideration.',
     'Ministry of Finance', 17, true, '{"modality": ["budgetary_support"]}'),
    
    -- Project Preparation specific
    ('PP_UNIT_CHIEF_APPOINTED', 'Project Preparation Unit Chief Appointed', 
     'Project Preparation Unit chief has been appointed and management of other staff ensured within three months.',
     'Provide appointment letter and staffing plan.',
     'Implementing Agency', 18, true, '{"modality": ["project_preparation"]}')
    
) AS i(code, title, description, guidance_text, responsible_agency_type, display_order, is_required, applicable_conditions)
WHERE t.code = 'PRE_NEGOTIATION'
ON CONFLICT (template_id, code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    guidance_text = EXCLUDED.guidance_text,
    responsible_agency_type = EXCLUDED.responsible_agency_type,
    display_order = EXCLUDED.display_order,
    is_required = EXCLUDED.is_required,
    applicable_conditions = EXCLUDED.applicable_conditions;

-- ============================================
-- STAGE 5: Pre-Agreement Signing
-- ============================================
INSERT INTO readiness_checklist_templates (code, name, description, stage_order, is_active)
VALUES (
    'PRE_SIGNING',
    'Pre-Agreement Signing',
    'Requirements before signing the financing agreement',
    5,
    true
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    stage_order = EXCLUDED.stage_order;

-- Stage 5 Items
INSERT INTO readiness_checklist_items (template_id, code, title, description, guidance_text, responsible_agency_type, display_order, is_required, applicable_conditions)
SELECT t.id, i.code, i.title, i.description, i.guidance_text, i.responsible_agency_type, i.display_order, i.is_required, i.applicable_conditions::jsonb
FROM readiness_checklist_templates t
CROSS JOIN (VALUES
    ('BID_EVALUATION_30PCT', 'Bid Evaluation Progress (30%)', 
     'For construction projects, bid evaluation of contracts covering at least 30% of total construction cost has been completed and is under approval stage.',
     'Provide bid evaluation reports for major contract packages.',
     'Implementing Agency', 1, true, '{"is_infrastructure": true}'),
    
    ('SIGNING_AUTHORIZATION', 'Signing Authorization Obtained', 
     'Authorization from the Council of Ministers or appropriate authority has been obtained for signing the agreement.',
     'Attach the authorization letter or cabinet decision.',
     'Ministry of Finance', 2, true, '{}'),
    
    -- Results-Based specific
    ('RBF_IVA_AGREEMENT_FINALIZED', 'Independent Verification Agency Agreement Finalized', 
     'Assurance of agreement with independent verification agency for verification services as required.',
     'The IVA agreement should be ready for signature.',
     'Implementing Agency', 3, true, '{"modality": ["results_based"]}')
    
) AS i(code, title, description, guidance_text, responsible_agency_type, display_order, is_required, applicable_conditions)
WHERE t.code = 'PRE_SIGNING'
ON CONFLICT (template_id, code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    guidance_text = EXCLUDED.guidance_text,
    responsible_agency_type = EXCLUDED.responsible_agency_type,
    display_order = EXCLUDED.display_order,
    is_required = EXCLUDED.is_required,
    applicable_conditions = EXCLUDED.applicable_conditions;

-- ============================================
-- STAGE 6: Pre-Effectiveness
-- ============================================
INSERT INTO readiness_checklist_templates (code, name, description, stage_order, is_active)
VALUES (
    'PRE_EFFECTIVENESS',
    'Pre-Effectiveness',
    'Requirements before the financing agreement becomes effective',
    6,
    true
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    stage_order = EXCLUDED.stage_order;

-- Stage 6 Items
INSERT INTO readiness_checklist_items (template_id, code, title, description, guidance_text, responsible_agency_type, display_order, is_required, applicable_conditions)
SELECT t.id, i.code, i.title, i.description, i.guidance_text, i.responsible_agency_type, i.display_order, i.is_required, i.applicable_conditions::jsonb
FROM readiness_checklist_templates t
CROSS JOIN (VALUES
    ('LEGAL_OPINION', 'Legal Opinion Obtained', 
     'Legal opinion has been obtained from the appropriate government legal authority.',
     'The legal opinion confirms the authority and validity of the financing agreement.',
     'Ministry of Finance', 1, true, '{}'),
    
    ('SUBSIDIARY_LOAN_FINALIZED', 'Subsidiary Loan Agreement Finalized', 
     'Subsidiary loan agreement has been finalized if applicable.',
     'For on-lending arrangements, the subsidiary agreement must be signed before effectiveness.',
     'Ministry of Finance', 2, true, '{"financing_type": ["loan"]}'),
    
    ('EFFECTIVENESS_CONDITIONS', 'All Effectiveness Conditions Met', 
     'All conditions precedent to effectiveness specified in the financing agreement have been satisfied.',
     'Review the agreement for any additional conditions and document their fulfillment.',
     'Implementing Agency', 3, true, '{}'),
    
    ('PIU_ESTABLISHED', 'Project Implementation Unit Established', 
     'The Project Implementation Unit has been formally established with key staff in place.',
     'Provide organizational chart and appointment letters for key positions.',
     'Implementing Agency', 4, true, '{}'),
    
    ('PROJECT_ACCOUNTS_OPENED', 'Project Accounts Opened', 
     'Designated project accounts (including any special accounts) have been opened.',
     'Provide bank account details and confirmation letters.',
     'Implementing Agency', 5, true, '{}'),
    
    ('INITIAL_DEPOSIT_MADE', 'Initial Counterpart Deposit Made', 
     'Initial counterpart fund deposit has been made if required.',
     'Provide proof of deposit or transfer.',
     'Ministry of Finance', 6, false, '{}')
    
) AS i(code, title, description, guidance_text, responsible_agency_type, display_order, is_required, applicable_conditions)
WHERE t.code = 'PRE_EFFECTIVENESS'
ON CONFLICT (template_id, code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    guidance_text = EXCLUDED.guidance_text,
    responsible_agency_type = EXCLUDED.responsible_agency_type,
    display_order = EXCLUDED.display_order,
    is_required = EXCLUDED.is_required,
    applicable_conditions = EXCLUDED.applicable_conditions;

-- Summary of what was created:
-- Stage 1 (PRE_PROPOSAL): 3 items
-- Stage 2 (PRE_DP_SUBMISSION): 3 items
-- Stage 3 (PRE_APPRAISAL): 20 items (including modality-specific)
-- Stage 4 (PRE_NEGOTIATION): 18 items (including modality-specific)
-- Stage 5 (PRE_SIGNING): 3 items
-- Stage 6 (PRE_EFFECTIVENESS): 6 items
-- Total: 53 items (not all will show for every project type due to conditions)
