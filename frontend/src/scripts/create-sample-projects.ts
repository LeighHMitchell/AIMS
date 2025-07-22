import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSampleProjects() {
  console.log('Creating sample projects...');

  try {
    // Get organization IDs
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .in('name', ['World Bank', 'USAID'])
      .limit(2);

    const worldBankId = orgs?.find(o => o.name.includes('World Bank'))?.id || orgs?.[0]?.id;
    const usaidId = orgs?.find(o => o.name.includes('USAID'))?.id || orgs?.[1]?.id;

    // Create activities
    const activities = [
      {
        id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
        title_narrative: 'Green Energy Access Initiative',
        description_narrative: '<p>The <strong>Green Energy Access Initiative</strong> is a transformative program designed to bring sustainable, affordable renewable energy solutions to rural and underserved communities across the region. This initiative addresses critical energy poverty affecting over 2 million people who currently lack reliable access to electricity.</p><p>Through strategic partnerships with local communities, government agencies, and private sector innovators, the program deploys solar microgrids, household solar systems, and community wind projects. The initiative emphasizes local capacity building, training community members as renewable energy technicians and establishing sustainable maintenance frameworks.</p><p>Key components include: installation of 500 solar microgrids serving 250,000 households, distribution of 100,000 solar home systems, establishment of 20 community-managed renewable energy cooperatives, and comprehensive training programs for 1,000 local technicians. The program also integrates productive use applications, supporting agricultural processing, small businesses, and healthcare facilities with reliable power.</p>',
        iati_identifier: 'XI-IATI-DEMO-10001',
        other_identifier: 'GEA-2024-001',
        activity_status: '2',
        planned_start_date: '2024-01-01',
        planned_end_date: '2027-12-31',
        actual_start_date: '2024-02-15',
        default_currency: 'USD',
        default_finance_type: '110',
        default_aid_type: '31166',
        default_tied_status: '5',
        hierarchy: 1,
        reporting_org_id: worldBankId,
        created_by_org_name: 'International Development Agency',
        created_by_org_acronym: 'IDA',
        submission_status: 'validated',
        publication_status: 'published',
        icon: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=400&fit=crop',
        banner: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=400&fit=crop'
      },
      {
        id: 'b2c3d4e5-6789-01bc-def2-2345678901bc',
        title_narrative: 'Digital Health Infrastructure Program',
        description_narrative: '<p>The <strong>Digital Health Infrastructure Program</strong> represents a comprehensive effort to revolutionize healthcare delivery through advanced digital technologies and integrated health information systems. This ambitious program aims to connect 500 health facilities, train 5,000 healthcare workers, and ultimately improve health outcomes for 5 million citizens.</p><p>The program focuses on establishing robust digital health platforms including electronic health records (EHR), telemedicine capabilities, mobile health applications, and data analytics systems. It emphasizes interoperability, data security, and user-centered design to ensure sustainable adoption across diverse healthcare settings.</p><p>Core deliverables include: deployment of integrated EHR systems in 500 facilities, establishment of 50 telemedicine centers in remote areas, development of mobile health apps for maternal and child health, creation of a national health data warehouse, and comprehensive digital literacy training for healthcare professionals. The initiative also includes provisions for cybersecurity infrastructure and data governance frameworks to protect sensitive health information.</p>',
        iati_identifier: 'XI-IATI-DEMO-10002',
        other_identifier: 'DHI-2024-002',
        activity_status: '2',
        planned_start_date: '2024-03-01',
        planned_end_date: '2028-02-29',
        actual_start_date: '2024-04-01',
        default_currency: 'USD',
        default_finance_type: '110',
        default_aid_type: '12261',
        default_tied_status: '5',
        hierarchy: 1,
        reporting_org_id: usaidId,
        created_by_org_name: 'United States Agency for International Development',
        created_by_org_acronym: 'USAID',
        submission_status: 'validated',
        publication_status: 'published',
        icon: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=400&fit=crop',
        banner: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=400&fit=crop'
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

    // Create sectors
    const sectors = [
      // Green Energy sectors
      {
        activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
        sector_code: '23183',
        sector_name: 'Energy generation, renewable sources - multiple technologies',
        sector_percentage: 40,
        sector_category_code: '231',
        sector_category_name: 'Energy Policy',
        category_percentage: 40,
        type: 'primary'
      },
      {
        activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
        sector_code: '23210',
        sector_name: 'Energy generation, renewable sources – multiple technologies',
        sector_percentage: 30,
        sector_category_code: '232',
        sector_category_name: 'Energy generation, renewable sources',
        category_percentage: 30,
        type: 'secondary'
      },
      {
        activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
        sector_code: '41081',
        sector_name: 'Environmental education/training',
        sector_percentage: 30,
        sector_category_code: '410',
        sector_category_name: 'General environmental protection',
        category_percentage: 30,
        type: 'secondary'
      },
      // Digital Health sectors
      {
        activity_id: 'b2c3d4e5-6789-01bc-def2-2345678901bc',
        sector_code: '12261',
        sector_name: 'Health education',
        sector_percentage: 35,
        sector_category_code: '122',
        sector_category_name: 'Basic Health',
        category_percentage: 35,
        type: 'primary'
      },
      {
        activity_id: 'b2c3d4e5-6789-01bc-def2-2345678901bc',
        sector_code: '12220',
        sector_name: 'Basic health care',
        sector_percentage: 35,
        sector_category_code: '122',
        sector_category_name: 'Basic Health',
        category_percentage: 35,
        type: 'secondary'
      },
      {
        activity_id: 'b2c3d4e5-6789-01bc-def2-2345678901bc',
        sector_code: '22040',
        sector_name: 'Information and communication technology (ICT)',
        sector_percentage: 30,
        sector_category_code: '220',
        sector_category_name: 'Communications',
        category_percentage: 30,
        type: 'secondary'
      }
    ];

    await supabase.from('activity_sectors').insert(sectors);

    // Create SDG mappings
    const sdgMappings = [
      // Green Energy SDGs
      { activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', sdg_goal: 7, sdg_target: '7.1', contribution_percent: 40, notes: 'Universal access to affordable, reliable and modern energy' },
      { activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', sdg_goal: 7, sdg_target: '7.2', contribution_percent: 30, notes: 'Increase share of renewable energy' },
      { activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', sdg_goal: 13, sdg_target: '13.2', contribution_percent: 30, notes: 'Climate change measures integrated into policies' },
      // Digital Health SDGs
      { activity_id: 'b2c3d4e5-6789-01bc-def2-2345678901bc', sdg_goal: 3, sdg_target: '3.8', contribution_percent: 50, notes: 'Achieve universal health coverage' },
      { activity_id: 'b2c3d4e5-6789-01bc-def2-2345678901bc', sdg_goal: 9, sdg_target: '9.c', contribution_percent: 50, notes: 'Universal and affordable access to ICT' }
    ];

    await supabase.from('activity_sdg_mappings').insert(sdgMappings);

    // Create transactions
    const transactions = [
      // Green Energy
      {
        activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
        transaction_type: 'Commitment',
        transaction_date: '2024-01-15',
        value_amount: 65000000,
        value_currency: 'USD',
        value_date: '2024-01-15',
        description: 'Total program commitment for Green Energy Access Initiative',
        provider_org_narrative: 'International Development Agency',
        receiver_org_narrative: 'Ministry of Energy'
      },
      {
        activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
        transaction_type: 'Disbursement',
        transaction_date: '2024-02-15',
        value_amount: 3750000,
        value_currency: 'USD',
        value_date: '2024-02-15',
        description: 'Q1 2024 disbursement - Phase 1 implementation',
        provider_org_narrative: 'International Development Agency',
        receiver_org_narrative: 'Green Energy Implementation Unit'
      },
      {
        activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
        transaction_type: 'Disbursement',
        transaction_date: '2024-05-15',
        value_amount: 3750000,
        value_currency: 'USD',
        value_date: '2024-05-15',
        description: 'Q2 2024 disbursement - Solar microgrid deployment',
        provider_org_narrative: 'International Development Agency',
        receiver_org_narrative: 'Green Energy Implementation Unit'
      },
      // Digital Health
      {
        activity_id: 'b2c3d4e5-6789-01bc-def2-2345678901bc',
        transaction_type: 'Commitment',
        transaction_date: '2024-03-01',
        value_amount: 110000000,
        value_currency: 'USD',
        value_date: '2024-03-01',
        description: 'Total program commitment for Digital Health Infrastructure',
        provider_org_narrative: 'USAID',
        receiver_org_narrative: 'Ministry of Health'
      },
      {
        activity_id: 'b2c3d4e5-6789-01bc-def2-2345678901bc',
        transaction_type: 'Disbursement',
        transaction_date: '2024-04-01',
        value_amount: 8000000,
        value_currency: 'USD',
        value_date: '2024-04-01',
        description: 'Initial disbursement - System procurement and setup',
        provider_org_narrative: 'USAID',
        receiver_org_narrative: 'Digital Health Program Office'
      }
    ];

    await supabase.from('transactions').insert(transactions);

    // Create budgets
    const budgets = [
      // Green Energy budgets
      { activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', budget_type: 'Original', budget_status: 'Indicative', period_start: '2024-01-01', period_end: '2024-12-31', value_amount: 15000000, value_currency: 'USD', value_date: '2023-12-01' },
      { activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', budget_type: 'Original', budget_status: 'Indicative', period_start: '2025-01-01', period_end: '2025-12-31', value_amount: 20000000, value_currency: 'USD', value_date: '2023-12-01' },
      { activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', budget_type: 'Original', budget_status: 'Indicative', period_start: '2026-01-01', period_end: '2026-12-31', value_amount: 18000000, value_currency: 'USD', value_date: '2023-12-01' },
      { activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', budget_type: 'Original', budget_status: 'Indicative', period_start: '2027-01-01', period_end: '2027-12-31', value_amount: 12000000, value_currency: 'USD', value_date: '2023-12-01' },
      // Digital Health budgets
      { activity_id: 'b2c3d4e5-6789-01bc-def2-2345678901bc', budget_type: 'Original', budget_status: 'Indicative', period_start: '2024-01-01', period_end: '2024-12-31', value_amount: 25000000, value_currency: 'USD', value_date: '2024-01-15' },
      { activity_id: 'b2c3d4e5-6789-01bc-def2-2345678901bc', budget_type: 'Original', budget_status: 'Indicative', period_start: '2025-01-01', period_end: '2025-12-31', value_amount: 30000000, value_currency: 'USD', value_date: '2024-01-15' },
      { activity_id: 'b2c3d4e5-6789-01bc-def2-2345678901bc', budget_type: 'Original', budget_status: 'Indicative', period_start: '2026-01-01', period_end: '2026-12-31', value_amount: 28000000, value_currency: 'USD', value_date: '2024-01-15' },
      { activity_id: 'b2c3d4e5-6789-01bc-def2-2345678901bc', budget_type: 'Original', budget_status: 'Indicative', period_start: '2027-01-01', period_end: '2027-12-31', value_amount: 22000000, value_currency: 'USD', value_date: '2024-01-15' }
    ];

    await supabase.from('activity_budgets').insert(budgets);

    // Create planned disbursements
    const plannedDisbursements = [
      // Green Energy
      { activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', disbursement_type: 'Outgoing', period_start: '2024-01-01', period_end: '2024-03-31', value_amount: 3750000, value_currency: 'USD', value_date: '2024-01-01', provider_org_narrative: 'Q1 2024 disbursement' },
      { activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', disbursement_type: 'Outgoing', period_start: '2024-04-01', period_end: '2024-06-30', value_amount: 3750000, value_currency: 'USD', value_date: '2024-04-01', provider_org_narrative: 'Q2 2024 disbursement' },
      { activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', disbursement_type: 'Outgoing', period_start: '2024-07-01', period_end: '2024-09-30', value_amount: 3750000, value_currency: 'USD', value_date: '2024-07-01', provider_org_narrative: 'Q3 2024 disbursement' },
      { activity_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', disbursement_type: 'Outgoing', period_start: '2024-10-01', period_end: '2024-12-31', value_amount: 3750000, value_currency: 'USD', value_date: '2024-10-01', provider_org_narrative: 'Q4 2024 disbursement' },
      // Digital Health
      { activity_id: 'b2c3d4e5-6789-01bc-def2-2345678901bc', disbursement_type: 'Outgoing', period_start: '2024-03-01', period_end: '2024-06-30', value_amount: 8000000, value_currency: 'USD', value_date: '2024-03-01', provider_org_narrative: 'Initial setup and procurement' },
      { activity_id: 'b2c3d4e5-6789-01bc-def2-2345678901bc', disbursement_type: 'Outgoing', period_start: '2024-07-01', period_end: '2024-09-30', value_amount: 6000000, value_currency: 'USD', value_date: '2024-07-01', provider_org_narrative: 'Q3 2024 implementation' },
      { activity_id: 'b2c3d4e5-6789-01bc-def2-2345678901bc', disbursement_type: 'Outgoing', period_start: '2024-10-01', period_end: '2024-12-31', value_amount: 6000000, value_currency: 'USD', value_date: '2024-10-01', provider_org_narrative: 'Q4 2024 rollout' }
    ];

    await supabase.from('activity_planned_disbursements').insert(plannedDisbursements);

    console.log('Sample projects created successfully!');
    
  } catch (error) {
    console.error('Error creating sample projects:', error);
  }
}

// Run the script
createSampleProjects();