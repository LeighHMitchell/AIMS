import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createHumanitarianProjects() {
  console.log('Creating 5 humanitarian and development-focused projects...');

  try {
    // Get organization IDs
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(10);

    if (!orgs || orgs.length === 0) {
      console.error('No organizations found');
      return;
    }

    // Create activities
    const activities = [
      {
        id: '01234567-89ab-cdef-0123-456789abcde1',
        title_narrative: 'Emergency Food Security and Nutrition Response',
        description_narrative: '<p>The <strong>Emergency Food Security and Nutrition Response</strong> program addresses acute food insecurity and malnutrition affecting 2.5 million people in conflict-affected and drought-prone regions. This comprehensive humanitarian intervention combines immediate life-saving assistance with resilience-building activities to break the cycle of crisis and vulnerability.</p><p>The program delivers emergency food assistance through cash transfers, food vouchers, and direct food distribution to 500,000 households. It establishes 200 nutrition stabilization centers treating severe acute malnutrition in children under five, pregnant and lactating women. Community-based nutrition screening and referral systems are implemented across 1,000 villages, complemented by blanket supplementary feeding programs during lean seasons.</p><p>Beyond emergency response, the initiative strengthens local food systems through seed distribution, livestock restocking, and rehabilitation of irrigation infrastructure. It establishes 500 community grain banks, trains 2,000 community nutrition volunteers, and implements early warning systems for food security monitoring. The program integrates protection mainstreaming, ensuring safe and dignified assistance delivery while addressing specific needs of vulnerable groups including elderly, disabled persons, and female-headed households.</p>',
        iati_identifier: 'XI-IATI-HUM-20001',
        other_identifier: 'EFSNR-2024-001',
        activity_status: '2',
        planned_start_date: '2024-01-01',
        planned_end_date: '2026-12-31',
        actual_start_date: '2024-01-15',
        default_currency: 'USD',
        default_finance_type: '110',
        default_aid_type: '52010',
        default_tied_status: '5',
        hierarchy: 1,
        reporting_org_id: orgs[0].id,
        created_by_org_name: 'World Food Programme',
        created_by_org_acronym: 'WFP',
        submission_status: 'validated',
        publication_status: 'published',
        icon: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400&h=400&fit=crop',
        banner: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1200&h=400&fit=crop'
      },
      {
        id: '01234567-89ab-cdef-0123-456789abcde2',
        title_narrative: 'Refugee Protection and Integration Program',
        description_narrative: '<p>The <strong>Refugee Protection and Integration Program</strong> provides comprehensive support to 300,000 refugees and 150,000 host community members, fostering peaceful coexistence and sustainable solutions. This multi-sectoral intervention addresses immediate protection needs while promoting long-term integration through livelihoods, education, and social cohesion initiatives.</p><p>Protection services include registration and documentation support, legal aid for 50,000 individuals, psychosocial support through 30 community centers, and specialized services for 10,000 survivors of gender-based violence. The program establishes child-friendly spaces benefiting 25,000 children, family tracing and reunification services, and protection monitoring systems across refugee settlements and urban areas.</p><p>Integration components focus on economic empowerment through vocational training for 20,000 refugees and host community members, job placement services, and support for 5,000 refugee-owned businesses. Educational initiatives include accelerated learning programs for 15,000 out-of-school children, language training, and scholarships for 1,000 refugee students in higher education. The program implements 200 joint community projects promoting social cohesion, establishes conflict resolution mechanisms, and advocates for policy reforms enabling refugee access to national services and labor markets.</p>',
        iati_identifier: 'XI-IATI-HUM-20002',
        other_identifier: 'RPIP-2024-002',
        activity_status: '2',
        planned_start_date: '2024-03-01',
        planned_end_date: '2027-02-28',
        actual_start_date: '2024-04-01',
        default_currency: 'USD',
        default_finance_type: '110',
        default_aid_type: '72010',
        default_tied_status: '5',
        hierarchy: 1,
        reporting_org_id: orgs[1]?.id || orgs[0].id,
        created_by_org_name: 'United Nations High Commissioner for Refugees',
        created_by_org_acronym: 'UNHCR',
        submission_status: 'validated',
        publication_status: 'published',
        icon: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400&h=400&fit=crop',
        banner: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200&h=400&fit=crop'
      },
      {
        id: '01234567-89ab-cdef-0123-456789abcde3',
        title_narrative: 'Emergency Health Response and Disease Prevention Initiative',
        description_narrative: '<p>The <strong>Emergency Health Response and Disease Prevention Initiative</strong> strengthens health systems and delivers life-saving medical services to 4 million people affected by humanitarian crises, disease outbreaks, and health system collapse. This comprehensive program combines emergency medical response with health system strengthening to ensure sustainable access to quality healthcare.</p><p>Emergency health services include deployment of 20 mobile health clinics reaching remote and conflict-affected areas, establishment of 10 field hospitals with surgical capacity, and provision of essential medicines to 500 health facilities. The program manages disease outbreak response including surveillance systems, rapid response teams, and vaccination campaigns reaching 1 million children. Mental health and psychosocial support services are integrated across all health facilities, with specialized trauma care for conflict-affected populations.</p><p>Health system strengthening focuses on rehabilitation of 50 damaged health facilities, training 5,000 healthcare workers in emergency medicine and disease surveillance, and establishment of cold chain systems for vaccine storage. The initiative implements community health programs training 10,000 community health workers, establishes referral networks linking communities to health facilities, and develops health information systems for real-time monitoring. Special attention is given to maternal and child health with establishment of 100 maternity waiting homes and emergency obstetric care services.</p>',
        iati_identifier: 'XI-IATI-HUM-20003',
        other_identifier: 'EHRDP-2024-003',
        activity_status: '2',
        planned_start_date: '2024-02-01',
        planned_end_date: '2027-01-31',
        actual_start_date: '2024-03-01',
        default_currency: 'USD',
        default_finance_type: '110',
        default_aid_type: '12220',
        default_tied_status: '5',
        hierarchy: 1,
        reporting_org_id: orgs[2]?.id || orgs[0].id,
        created_by_org_name: 'World Health Organization',
        created_by_org_acronym: 'WHO',
        submission_status: 'validated',
        publication_status: 'published',
        icon: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=400&h=400&fit=crop',
        banner: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=1200&h=400&fit=crop'
      },
      {
        id: '01234567-89ab-cdef-0123-456789abcde4',
        title_narrative: 'Child Protection in Emergencies Program',
        description_narrative: '<p>The <strong>Child Protection in Emergencies Program</strong> safeguards 1.5 million children affected by conflict, displacement, and natural disasters from violence, exploitation, and abuse. This comprehensive child protection intervention addresses immediate safety needs while building sustainable protection systems that ensure children\'s rights and wellbeing in humanitarian contexts.</p><p>Protection services include identification and registration of 50,000 unaccompanied and separated children, family tracing and reunification for 10,000 children, and alternative care arrangements through trained foster families. The program establishes 200 child-friendly spaces providing psychosocial support, recreational activities, and life skills education. Case management services support 30,000 vulnerable children including survivors of violence, children associated with armed forces, and children with disabilities.</p><p>System strengthening components include training 5,000 social workers and child protection actors, establishing community-based child protection mechanisms in 1,000 communities, and developing referral pathways linking communities to specialized services. The program implements birth registration campaigns reaching 200,000 children, advocates for child-friendly justice systems, and supports reintegration of 5,000 children formerly associated with armed groups. Education initiatives include accelerated learning programs, back-to-school campaigns benefiting 100,000 out-of-school children, and provision of educational supplies and temporary learning spaces in emergency settings.</p>',
        iati_identifier: 'XI-IATI-HUM-20004',
        other_identifier: 'CPEP-2024-004',
        activity_status: '2',
        planned_start_date: '2024-04-01',
        planned_end_date: '2027-03-31',
        actual_start_date: '2024-05-01',
        default_currency: 'USD',
        default_finance_type: '110',
        default_aid_type: '16010',
        default_tied_status: '5',
        hierarchy: 1,
        reporting_org_id: orgs[3]?.id || orgs[0].id,
        created_by_org_name: 'Save the Children International',
        created_by_org_acronym: 'SCI',
        submission_status: 'validated',
        publication_status: 'published',
        icon: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=400&fit=crop',
        banner: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&h=400&fit=crop'
      },
      {
        id: '01234567-89ab-cdef-0123-456789abcde5',
        title_narrative: 'Disaster Risk Reduction and Community Resilience Program',
        description_narrative: '<p>The <strong>Disaster Risk Reduction and Community Resilience Program</strong> builds resilience of 3 million people in disaster-prone areas through comprehensive risk reduction, preparedness, and response capacity strengthening. This forward-looking humanitarian and development program shifts focus from reactive emergency response to proactive risk management and community empowerment.</p><p>Risk reduction activities include hazard mapping and vulnerability assessments in 500 communities, implementation of early warning systems covering floods, droughts, and cyclones, and construction of 200 disaster-resilient community shelters doubling as schools and health centers. The program implements ecosystem-based disaster risk reduction through reforestation of 10,000 hectares, wetland restoration, and sustainable land management practices. Infrastructure improvements include flood defenses, earthquake-resistant construction techniques, and climate-proofing of critical facilities.</p><p>Community preparedness components establish and train 1,000 community disaster management committees, conduct simulation exercises reaching 500,000 people, and pre-position emergency supplies in strategic locations. The program develops contingency plans at community, district, and national levels, trains 10,000 first responders, and establishes community emergency funds. Institutional strengthening includes support to national disaster management agencies, integration of disaster risk reduction into development planning, and establishment of multi-hazard monitoring and response centers. Special focus on inclusive disaster risk reduction ensures participation of women, elderly, persons with disabilities, and marginalized groups in all activities.</p>',
        iati_identifier: 'XI-IATI-HUM-20005',
        other_identifier: 'DRRCP-2024-005',
        activity_status: '2',
        planned_start_date: '2024-06-01',
        planned_end_date: '2028-05-31',
        actual_start_date: '2024-07-01',
        default_currency: 'USD',
        default_finance_type: '110',
        default_aid_type: '74010',
        default_tied_status: '5',
        hierarchy: 1,
        reporting_org_id: orgs[4]?.id || orgs[0].id,
        created_by_org_name: 'International Federation of Red Cross',
        created_by_org_acronym: 'IFRC',
        submission_status: 'validated',
        publication_status: 'published',
        icon: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=400&fit=crop',
        banner: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=1200&h=400&fit=crop'
      }
    ];

    // Insert activities
    const { error: activitiesError } = await supabase
      .from('activities')
      .insert(activities);

    if (activitiesError) {
      console.error('Error creating activities:', activitiesError);
      return;
    }

    console.log('Activities created successfully');

    // Create sectors for all projects
    const sectors = [
      // Emergency Food Security sectors
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', sector_code: '52010', sector_name: 'Food assistance', sector_percentage: 50, sector_category_code: '520', sector_category_name: 'Development Food Assistance', category_percentage: 50, type: 'primary' },
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', sector_code: '12240', sector_name: 'Basic nutrition', sector_percentage: 30, sector_category_code: '122', sector_category_name: 'Basic Health', category_percentage: 30, type: 'secondary' },
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', sector_code: '31161', sector_name: 'Food crop production', sector_percentage: 20, sector_category_code: '311', sector_category_name: 'Agriculture', category_percentage: 20, type: 'secondary' },
      
      // Refugee Protection sectors
      { activity_id: 'h2b3c4d5-6789-01bc-def2-humanitarian02', sector_code: '72010', sector_name: 'Material relief assistance and services', sector_percentage: 40, sector_category_code: '720', sector_category_name: 'Emergency Response', category_percentage: 40, type: 'primary' },
      { activity_id: 'h2b3c4d5-6789-01bc-def2-humanitarian02', sector_code: '11330', sector_name: 'Vocational training', sector_percentage: 30, sector_category_code: '113', sector_category_name: 'Secondary Education', category_percentage: 30, type: 'secondary' },
      { activity_id: 'h2b3c4d5-6789-01bc-def2-humanitarian02', sector_code: '15220', sector_name: 'Civilian peace-building, conflict prevention', sector_percentage: 30, sector_category_code: '152', sector_category_name: 'Conflict, Peace & Security', category_percentage: 30, type: 'secondary' },
      
      // Emergency Health sectors
      { activity_id: 'h3c4d5e6-7890-12cd-ef34-humanitarian03', sector_code: '12220', sector_name: 'Basic health care', sector_percentage: 40, sector_category_code: '122', sector_category_name: 'Basic Health', category_percentage: 40, type: 'primary' },
      { activity_id: 'h3c4d5e6-7890-12cd-ef34-humanitarian03', sector_code: '12250', sector_name: 'Infectious disease control', sector_percentage: 35, sector_category_code: '122', sector_category_name: 'Basic Health', category_percentage: 35, type: 'secondary' },
      { activity_id: 'h3c4d5e6-7890-12cd-ef34-humanitarian03', sector_code: '12281', sector_name: 'Health personnel development', sector_percentage: 25, sector_category_code: '122', sector_category_name: 'Basic Health', category_percentage: 25, type: 'secondary' },
      
      // Child Protection sectors
      { activity_id: 'h4d5e6f7-8901-23de-f456-humanitarian04', sector_code: '16010', sector_name: 'Social protection', sector_percentage: 40, sector_category_code: '160', sector_category_name: 'Other Social Infrastructure', category_percentage: 40, type: 'primary' },
      { activity_id: 'h4d5e6f7-8901-23de-f456-humanitarian04', sector_code: '11231', sector_name: 'Basic life skills for youth', sector_percentage: 30, sector_category_code: '112', sector_category_name: 'Basic Education', category_percentage: 30, type: 'secondary' },
      { activity_id: 'h4d5e6f7-8901-23de-f456-humanitarian04', sector_code: '15261', sector_name: 'Child soldiers (prevention and demobilisation)', sector_percentage: 30, sector_category_code: '152', sector_category_name: 'Conflict, Peace & Security', category_percentage: 30, type: 'secondary' },
      
      // Disaster Risk Reduction sectors
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', sector_code: '74010', sector_name: 'Disaster prevention and preparedness', sector_percentage: 50, sector_category_code: '740', sector_category_name: 'Disaster Prevention & Preparedness', category_percentage: 50, type: 'primary' },
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', sector_code: '41050', sector_name: 'Flood prevention/control', sector_percentage: 25, sector_category_code: '410', sector_category_name: 'General environmental protection', category_percentage: 25, type: 'secondary' },
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', sector_code: '43060', sector_name: 'Disaster Risk Reduction', sector_percentage: 25, sector_category_code: '430', sector_category_name: 'Other Multisector', category_percentage: 25, type: 'secondary' }
    ];

    await supabase.from('activity_sectors').insert(sectors);

    // Create SDG mappings
    const sdgMappings = [
      // Emergency Food Security SDGs
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', sdg_goal: 2, sdg_target: '2.1', contribution_percent: 50, notes: 'End hunger and ensure access to food' },
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', sdg_goal: 2, sdg_target: '2.2', contribution_percent: 30, notes: 'End all forms of malnutrition' },
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', sdg_goal: 1, sdg_target: '1.5', contribution_percent: 20, notes: 'Build resilience of the poor and vulnerable' },
      
      // Refugee Protection SDGs
      { activity_id: 'h2b3c4d5-6789-01bc-def2-humanitarian02', sdg_goal: 10, sdg_target: '10.7', contribution_percent: 40, notes: 'Facilitate orderly, safe migration' },
      { activity_id: 'h2b3c4d5-6789-01bc-def2-humanitarian02', sdg_goal: 16, sdg_target: '16.9', contribution_percent: 30, notes: 'Provide legal identity for all' },
      { activity_id: 'h2b3c4d5-6789-01bc-def2-humanitarian02', sdg_goal: 8, sdg_target: '8.8', contribution_percent: 30, notes: 'Protect labour rights of migrant workers' },
      
      // Emergency Health SDGs
      { activity_id: 'h3c4d5e6-7890-12cd-ef34-humanitarian03', sdg_goal: 3, sdg_target: '3.8', contribution_percent: 40, notes: 'Achieve universal health coverage' },
      { activity_id: 'h3c4d5e6-7890-12cd-ef34-humanitarian03', sdg_goal: 3, sdg_target: '3.3', contribution_percent: 35, notes: 'Combat communicable diseases' },
      { activity_id: 'h3c4d5e6-7890-12cd-ef34-humanitarian03', sdg_goal: 3, sdg_target: '3.d', contribution_percent: 25, notes: 'Strengthen capacity for health risk management' },
      
      // Child Protection SDGs
      { activity_id: 'h4d5e6f7-8901-23de-f456-humanitarian04', sdg_goal: 16, sdg_target: '16.2', contribution_percent: 40, notes: 'End abuse, exploitation of children' },
      { activity_id: 'h4d5e6f7-8901-23de-f456-humanitarian04', sdg_goal: 4, sdg_target: '4.1', contribution_percent: 30, notes: 'Ensure quality primary education' },
      { activity_id: 'h4d5e6f7-8901-23de-f456-humanitarian04', sdg_goal: 5, sdg_target: '5.2', contribution_percent: 30, notes: 'Eliminate violence against girls' },
      
      // Disaster Risk Reduction SDGs
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', sdg_goal: 13, sdg_target: '13.1', contribution_percent: 40, notes: 'Strengthen resilience to climate-related hazards' },
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', sdg_goal: 11, sdg_target: '11.5', contribution_percent: 35, notes: 'Reduce deaths and losses from disasters' },
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', sdg_goal: 1, sdg_target: '1.5', contribution_percent: 25, notes: 'Build resilience of the poor' }
    ];

    await supabase.from('activity_sdg_mappings').insert(sdgMappings);

    // Create budgets for all projects
    const budgets = [
      // Emergency Food Security budgets (3 years, $90M total)
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', budget_type: 'Original', budget_status: 'Indicative', period_start: '2024-01-01', period_end: '2024-12-31', value_amount: 35000000, value_currency: 'USD', value_date: '2023-12-01' },
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', budget_type: 'Original', budget_status: 'Indicative', period_start: '2025-01-01', period_end: '2025-12-31', value_amount: 30000000, value_currency: 'USD', value_date: '2023-12-01' },
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', budget_type: 'Original', budget_status: 'Indicative', period_start: '2026-01-01', period_end: '2026-12-31', value_amount: 25000000, value_currency: 'USD', value_date: '2023-12-01' },
      
      // Refugee Protection budgets (3 years, $75M total)
      { activity_id: 'h2b3c4d5-6789-01bc-def2-humanitarian02', budget_type: 'Original', budget_status: 'Indicative', period_start: '2024-03-01', period_end: '2025-02-28', value_amount: 28000000, value_currency: 'USD', value_date: '2024-02-01' },
      { activity_id: 'h2b3c4d5-6789-01bc-def2-humanitarian02', budget_type: 'Original', budget_status: 'Indicative', period_start: '2025-03-01', period_end: '2026-02-28', value_amount: 25000000, value_currency: 'USD', value_date: '2024-02-01' },
      { activity_id: 'h2b3c4d5-6789-01bc-def2-humanitarian02', budget_type: 'Original', budget_status: 'Indicative', period_start: '2026-03-01', period_end: '2027-02-28', value_amount: 22000000, value_currency: 'USD', value_date: '2024-02-01' },
      
      // Emergency Health budgets (3 years, $100M total)
      { activity_id: 'h3c4d5e6-7890-12cd-ef34-humanitarian03', budget_type: 'Original', budget_status: 'Indicative', period_start: '2024-02-01', period_end: '2025-01-31', value_amount: 40000000, value_currency: 'USD', value_date: '2024-01-01' },
      { activity_id: 'h3c4d5e6-7890-12cd-ef34-humanitarian03', budget_type: 'Original', budget_status: 'Indicative', period_start: '2025-02-01', period_end: '2026-01-31', value_amount: 35000000, value_currency: 'USD', value_date: '2024-01-01' },
      { activity_id: 'h3c4d5e6-7890-12cd-ef34-humanitarian03', budget_type: 'Original', budget_status: 'Indicative', period_start: '2026-02-01', period_end: '2027-01-31', value_amount: 25000000, value_currency: 'USD', value_date: '2024-01-01' },
      
      // Child Protection budgets (3 years, $60M total)
      { activity_id: 'h4d5e6f7-8901-23de-f456-humanitarian04', budget_type: 'Original', budget_status: 'Indicative', period_start: '2024-04-01', period_end: '2025-03-31', value_amount: 22000000, value_currency: 'USD', value_date: '2024-03-01' },
      { activity_id: 'h4d5e6f7-8901-23de-f456-humanitarian04', budget_type: 'Original', budget_status: 'Indicative', period_start: '2025-04-01', period_end: '2026-03-31', value_amount: 20000000, value_currency: 'USD', value_date: '2024-03-01' },
      { activity_id: 'h4d5e6f7-8901-23de-f456-humanitarian04', budget_type: 'Original', budget_status: 'Indicative', period_start: '2026-04-01', period_end: '2027-03-31', value_amount: 18000000, value_currency: 'USD', value_date: '2024-03-01' },
      
      // Disaster Risk Reduction budgets (4 years, $80M total)
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', budget_type: 'Original', budget_status: 'Indicative', period_start: '2024-06-01', period_end: '2025-05-31', value_amount: 20000000, value_currency: 'USD', value_date: '2024-05-01' },
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', budget_type: 'Original', budget_status: 'Indicative', period_start: '2025-06-01', period_end: '2026-05-31', value_amount: 22000000, value_currency: 'USD', value_date: '2024-05-01' },
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', budget_type: 'Original', budget_status: 'Indicative', period_start: '2026-06-01', period_end: '2027-05-31', value_amount: 20000000, value_currency: 'USD', value_date: '2024-05-01' },
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', budget_type: 'Original', budget_status: 'Indicative', period_start: '2027-06-01', period_end: '2028-05-31', value_amount: 18000000, value_currency: 'USD', value_date: '2024-05-01' }
    ];

    await supabase.from('activity_budgets').insert(budgets);

    // Create transactions (commitments and some disbursements)
    const transactions = [
      // Emergency Food Security
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', transaction_type: 'Commitment', transaction_date: '2024-01-15', value_amount: 90000000, value_currency: 'USD', value_date: '2024-01-15', description: 'Total commitment for Emergency Food Security Response', provider_org_narrative: 'World Food Programme', receiver_org_narrative: 'National Disaster Management Agency' },
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', transaction_type: 'Disbursement', transaction_date: '2024-02-01', value_amount: 10000000, value_currency: 'USD', value_date: '2024-02-01', description: 'Emergency food distribution phase 1', provider_org_narrative: 'WFP', receiver_org_narrative: 'Emergency Response Unit' },
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', transaction_type: 'Disbursement', transaction_date: '2024-05-01', value_amount: 8750000, value_currency: 'USD', value_date: '2024-05-01', description: 'Nutrition stabilization centers setup', provider_org_narrative: 'WFP', receiver_org_narrative: 'Health Ministry' },
      
      // Refugee Protection
      { activity_id: 'h2b3c4d5-6789-01bc-def2-humanitarian02', transaction_type: 'Commitment', transaction_date: '2024-03-15', value_amount: 75000000, value_currency: 'USD', value_date: '2024-03-15', description: 'Total commitment for Refugee Protection Program', provider_org_narrative: 'UNHCR', receiver_org_narrative: 'Ministry of Interior' },
      { activity_id: 'h2b3c4d5-6789-01bc-def2-humanitarian02', transaction_type: 'Disbursement', transaction_date: '2024-04-15', value_amount: 7000000, value_currency: 'USD', value_date: '2024-04-15', description: 'Refugee registration and documentation', provider_org_narrative: 'UNHCR', receiver_org_narrative: 'Refugee Affairs Department' },
      
      // Emergency Health
      { activity_id: 'h3c4d5e6-7890-12cd-ef34-humanitarian03', transaction_type: 'Commitment', transaction_date: '2024-02-15', value_amount: 100000000, value_currency: 'USD', value_date: '2024-02-15', description: 'Total commitment for Emergency Health Response', provider_org_narrative: 'WHO', receiver_org_narrative: 'Ministry of Health' },
      { activity_id: 'h3c4d5e6-7890-12cd-ef34-humanitarian03', transaction_type: 'Disbursement', transaction_date: '2024-03-15', value_amount: 10000000, value_currency: 'USD', value_date: '2024-03-15', description: 'Mobile health clinics deployment', provider_org_narrative: 'WHO', receiver_org_narrative: 'Emergency Health Unit' },
      
      // Child Protection
      { activity_id: 'h4d5e6f7-8901-23de-f456-humanitarian04', transaction_type: 'Commitment', transaction_date: '2024-04-15', value_amount: 60000000, value_currency: 'USD', value_date: '2024-04-15', description: 'Total commitment for Child Protection Program', provider_org_narrative: 'Save the Children', receiver_org_narrative: 'Ministry of Social Welfare' },
      { activity_id: 'h4d5e6f7-8901-23de-f456-humanitarian04', transaction_type: 'Disbursement', transaction_date: '2024-05-15', value_amount: 5500000, value_currency: 'USD', value_date: '2024-05-15', description: 'Child-friendly spaces establishment', provider_org_narrative: 'Save the Children', receiver_org_narrative: 'Child Protection Services' },
      
      // Disaster Risk Reduction
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', transaction_type: 'Commitment', transaction_date: '2024-06-15', value_amount: 80000000, value_currency: 'USD', value_date: '2024-06-15', description: 'Total commitment for Disaster Risk Reduction', provider_org_narrative: 'IFRC', receiver_org_narrative: 'National Disaster Management Authority' },
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', transaction_type: 'Disbursement', transaction_date: '2024-07-15', value_amount: 5000000, value_currency: 'USD', value_date: '2024-07-15', description: 'Early warning systems installation', provider_org_narrative: 'IFRC', receiver_org_narrative: 'Meteorological Department' }
    ];

    await supabase.from('transactions').insert(transactions);

    // Create planned disbursements
    const plannedDisbursements = [
      // Emergency Food Security
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', disbursement_type: 'Outgoing', period_start: '2024-07-01', period_end: '2024-09-30', value_amount: 8750000, value_currency: 'USD', value_date: '2024-07-01', provider_org_narrative: 'Q3 2024 - Food distribution and nutrition support' },
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', disbursement_type: 'Outgoing', period_start: '2024-10-01', period_end: '2024-12-31', value_amount: 8750000, value_currency: 'USD', value_date: '2024-10-01', provider_org_narrative: 'Q4 2024 - Lean season response' },
      
      // Refugee Protection
      { activity_id: 'h2b3c4d5-6789-01bc-def2-humanitarian02', disbursement_type: 'Outgoing', period_start: '2024-07-01', period_end: '2024-09-30', value_amount: 7000000, value_currency: 'USD', value_date: '2024-07-01', provider_org_narrative: 'Q3 2024 - Protection services expansion' },
      { activity_id: 'h2b3c4d5-6789-01bc-def2-humanitarian02', disbursement_type: 'Outgoing', period_start: '2024-10-01', period_end: '2024-12-31', value_amount: 7000000, value_currency: 'USD', value_date: '2024-10-01', provider_org_narrative: 'Q4 2024 - Integration programs' },
      
      // Emergency Health
      { activity_id: 'h3c4d5e6-7890-12cd-ef34-humanitarian03', disbursement_type: 'Outgoing', period_start: '2024-07-01', period_end: '2024-09-30', value_amount: 10000000, value_currency: 'USD', value_date: '2024-07-01', provider_org_narrative: 'Q3 2024 - Disease outbreak response' },
      { activity_id: 'h3c4d5e6-7890-12cd-ef34-humanitarian03', disbursement_type: 'Outgoing', period_start: '2024-10-01', period_end: '2024-12-31', value_amount: 10000000, value_currency: 'USD', value_date: '2024-10-01', provider_org_narrative: 'Q4 2024 - Health system strengthening' },
      
      // Child Protection
      { activity_id: 'h4d5e6f7-8901-23de-f456-humanitarian04', disbursement_type: 'Outgoing', period_start: '2024-07-01', period_end: '2024-09-30', value_amount: 5500000, value_currency: 'USD', value_date: '2024-07-01', provider_org_narrative: 'Q3 2024 - Case management systems' },
      { activity_id: 'h4d5e6f7-8901-23de-f456-humanitarian04', disbursement_type: 'Outgoing', period_start: '2024-10-01', period_end: '2024-12-31', value_amount: 5500000, value_currency: 'USD', value_date: '2024-10-01', provider_org_narrative: 'Q4 2024 - Education support' },
      
      // Disaster Risk Reduction
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', disbursement_type: 'Outgoing', period_start: '2024-10-01', period_end: '2024-12-31', value_amount: 5000000, value_currency: 'USD', value_date: '2024-10-01', provider_org_narrative: 'Q4 2024 - Community preparedness' },
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', disbursement_type: 'Outgoing', period_start: '2025-01-01', period_end: '2025-03-31', value_amount: 5000000, value_currency: 'USD', value_date: '2025-01-01', provider_org_narrative: 'Q1 2025 - Infrastructure resilience' }
    ];

    await supabase.from('activity_planned_disbursements').insert(plannedDisbursements);

    // Add contacts for each project
    const contacts = [
      { activity_id: 'h1a2b3c4-5678-90ab-cdef-humanitarian01', type: 'administrative', first_name: 'Dr. Ahmed', last_name: 'Hassan', position: 'Emergency Coordinator', organisation: 'WFP Country Office', email: 'ahassan@wfp.org', phone: '+1-202-555-0201' },
      { activity_id: 'h2b3c4d5-6789-01bc-def2-humanitarian02', type: 'administrative', first_name: 'Elena', last_name: 'Petrov', position: 'Protection Officer', organisation: 'UNHCR Regional Office', email: 'epetrov@unhcr.org', phone: '+1-202-555-0202' },
      { activity_id: 'h3c4d5e6-7890-12cd-ef34-humanitarian03', type: 'technical', first_name: 'Dr. Samuel', last_name: 'Okonkwo', position: 'Health Emergency Manager', organisation: 'WHO Emergency Response', email: 'sokonkwo@who.int', phone: '+1-202-555-0203' },
      { activity_id: 'h4d5e6f7-8901-23de-f456-humanitarian04', type: 'administrative', first_name: 'Patricia', last_name: 'Williams', position: 'Child Protection Specialist', organisation: 'Save the Children', email: 'pwilliams@savechildren.org', phone: '+1-202-555-0204' },
      { activity_id: 'h5e6f7a8-9012-34ef-a567-humanitarian05', type: 'technical', first_name: 'Kenji', last_name: 'Tanaka', position: 'DRR Technical Advisor', organisation: 'IFRC Asia Pacific', email: 'ktanaka@ifrc.org', phone: '+1-202-555-0205' }
    ];

    await supabase.from('activity_contacts').insert(contacts);

    console.log('5 humanitarian and development-focused projects created successfully!');
    
  } catch (error) {
    console.error('Error creating humanitarian projects:', error);
  }
}

// Run the script
createHumanitarianProjects();