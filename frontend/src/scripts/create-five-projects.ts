import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createFiveProjects() {
  console.log('Creating 5 new comprehensive projects...');

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
        id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd',
        title_narrative: 'Rural Water Supply and Sanitation Program',
        description_narrative: '<p>The <strong>Rural Water Supply and Sanitation Program</strong> is a comprehensive initiative aimed at providing sustainable access to clean water and improved sanitation facilities for 1.5 million people in underserved rural communities. This transformative program addresses the critical challenges of water scarcity, poor sanitation, and waterborne diseases that disproportionately affect rural populations.</p><p>The program employs a community-driven approach, establishing water user committees, training local technicians, and implementing sustainable financing mechanisms. Key infrastructure components include drilling and rehabilitation of 2,000 boreholes, construction of 500 gravity-fed water systems, installation of 10,000 household rainwater harvesting systems, and building 50,000 improved latrines.</p><p>Beyond infrastructure, the program emphasizes behavioral change through hygiene education, school WASH programs, and community health clubs. It integrates climate-resilient design principles and promotes gender equality by ensuring women\'s leadership in water management committees. The initiative also supports income-generating activities through productive water use for agriculture and small enterprises.</p>',
        iati_identifier: 'XI-IATI-DEMO-10003',
        other_identifier: 'RWSS-2024-003',
        activity_status: '2',
        planned_start_date: '2024-04-01',
        planned_end_date: '2029-03-31',
        actual_start_date: '2024-05-15',
        default_currency: 'USD',
        default_finance_type: '110',
        default_aid_type: '14031',
        default_tied_status: '5',
        hierarchy: 1,
        reporting_org_id: orgs[0].id,
        created_by_org_name: 'African Development Bank',
        created_by_org_acronym: 'AfDB',
        submission_status: 'validated',
        publication_status: 'published',
        icon: 'https://images.unsplash.com/photo-1541544537156-7627a7a4aa1c?w=400&h=400&fit=crop',
        banner: 'https://images.unsplash.com/photo-1541544537156-7627a7a4aa1c?w=1200&h=400&fit=crop'
      },
      {
        id: 'd4e5f6a7-8901-23de-f456-4567890123ef',
        title_narrative: 'Climate-Smart Agriculture and Food Security Initiative',
        description_narrative: '<p>The <strong>Climate-Smart Agriculture and Food Security Initiative</strong> represents a paradigm shift in agricultural development, integrating climate adaptation, mitigation, and productivity enhancement to ensure food security for 3 million people. This comprehensive program addresses the dual challenges of increasing agricultural productivity while building resilience to climate change impacts.</p><p>The initiative promotes sustainable intensification through conservation agriculture, agroforestry, integrated pest management, and precision farming technologies. It establishes 100 farmer field schools, 50 agricultural innovation hubs, and 1,000 demonstration plots showcasing climate-smart practices. The program provides improved seeds, organic fertilizers, and small-scale irrigation equipment to 200,000 smallholder farmers.</p><p>Key components include development of early warning systems for weather and pest outbreaks, establishment of crop insurance schemes, strengthening of agricultural value chains, and creation of market linkages through digital platforms. The program particularly focuses on empowering women farmers and youth through targeted training, credit access, and agribusiness development support.</p>',
        iati_identifier: 'XI-IATI-DEMO-10004',
        other_identifier: 'CSAFS-2024-004',
        activity_status: '2',
        planned_start_date: '2024-06-01',
        planned_end_date: '2028-05-31',
        actual_start_date: '2024-07-01',
        default_currency: 'USD',
        default_finance_type: '110',
        default_aid_type: '31161',
        default_tied_status: '5',
        hierarchy: 1,
        reporting_org_id: orgs[1]?.id || orgs[0].id,
        created_by_org_name: 'Food and Agriculture Organization',
        created_by_org_acronym: 'FAO',
        submission_status: 'validated',
        publication_status: 'published',
        icon: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=400&fit=crop',
        banner: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&h=400&fit=crop'
      },
      {
        id: 'e5f6a7b8-9012-34ef-a567-5678901234ab',
        title_narrative: 'Inclusive Education and Digital Learning Program',
        description_narrative: '<p>The <strong>Inclusive Education and Digital Learning Program</strong> is an ambitious initiative designed to transform educational outcomes for 2 million children and youth, with a particular focus on marginalized groups including girls, children with disabilities, and those in remote areas. This comprehensive program leverages technology and innovative pedagogical approaches to ensure quality education for all.</p><p>The program establishes 500 smart classrooms equipped with interactive digital boards, tablets, and internet connectivity. It develops a national digital learning platform hosting curriculum-aligned content in multiple languages, teacher training modules, and assessment tools. The initiative trains 50,000 teachers in digital pedagogy, inclusive education practices, and 21st-century skills development.</p><p>Special emphasis is placed on girls\' education through provision of scholarships, safe transportation, and mentorship programs. For children with disabilities, the program provides assistive technologies, accessible learning materials, and specialized teacher training. Community engagement components include parent education programs, school management committees strengthening, and establishment of community learning centers for out-of-school youth.</p>',
        iati_identifier: 'XI-IATI-DEMO-10005',
        other_identifier: 'IEDL-2024-005',
        activity_status: '2',
        planned_start_date: '2024-09-01',
        planned_end_date: '2029-08-31',
        actual_start_date: '2024-10-01',
        default_currency: 'USD',
        default_finance_type: '110',
        default_aid_type: '11220',
        default_tied_status: '5',
        hierarchy: 1,
        reporting_org_id: orgs[2]?.id || orgs[0].id,
        created_by_org_name: 'United Nations Children\'s Fund',
        created_by_org_acronym: 'UNICEF',
        submission_status: 'validated',
        publication_status: 'published',
        icon: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=400&fit=crop',
        banner: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&h=400&fit=crop'
      },
      {
        id: 'f6a7b8c9-0123-45fa-b678-6789012345bc',
        title_narrative: 'Urban Resilience and Sustainable Cities Program',
        description_narrative: '<p>The <strong>Urban Resilience and Sustainable Cities Program</strong> addresses the complex challenges of rapid urbanization by building climate-resilient, inclusive, and sustainable cities that improve quality of life for 5 million urban residents. This integrated program tackles issues of informal settlements, inadequate infrastructure, environmental degradation, and climate vulnerability in 10 major cities.</p><p>The initiative includes upgrading of 200 informal settlements with improved housing, water, sanitation, and electricity connections. It develops 50 kilometers of bus rapid transit systems, 200 kilometers of bicycle lanes, and 100 public parks and green spaces. The program implements smart city technologies including intelligent traffic management, waste sorting and recycling systems, and energy-efficient street lighting.</p><p>Climate adaptation measures include construction of urban drainage systems, flood defenses, and green infrastructure for heat island mitigation. The program establishes disaster risk management centers, early warning systems, and community emergency response teams. Social inclusion components focus on affordable housing, job creation through green enterprises, and participatory urban planning processes that give voice to marginalized communities.</p>',
        iati_identifier: 'XI-IATI-DEMO-10006',
        other_identifier: 'URSC-2024-006',
        activity_status: '2',
        planned_start_date: '2024-07-01',
        planned_end_date: '2029-06-30',
        actual_start_date: '2024-08-15',
        default_currency: 'USD',
        default_finance_type: '110',
        default_aid_type: '43030',
        default_tied_status: '5',
        hierarchy: 1,
        reporting_org_id: orgs[3]?.id || orgs[0].id,
        created_by_org_name: 'Asian Development Bank',
        created_by_org_acronym: 'ADB',
        submission_status: 'validated',
        publication_status: 'published',
        icon: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=400&fit=crop',
        banner: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&h=400&fit=crop'
      },
      {
        id: 'a7b8c9d0-1234-56ab-c789-7890123456cd',
        title_narrative: 'Women\'s Economic Empowerment and Leadership Program',
        description_narrative: '<p>The <strong>Women\'s Economic Empowerment and Leadership Program</strong> is a transformative initiative designed to advance gender equality and women\'s economic participation across multiple sectors. This comprehensive program aims to economically empower 500,000 women and girls through entrepreneurship support, skills development, financial inclusion, and leadership training.</p><p>The program establishes 100 women\'s business incubation centers providing training, mentorship, and seed funding for women-led enterprises. It facilitates access to credit through partnerships with microfinance institutions, guarantee funds, and mobile banking solutions. The initiative provides vocational and digital skills training in high-demand sectors including technology, renewable energy, agribusiness, and healthcare.</p><p>Leadership development components include political participation training, support for women\'s organizations, and establishment of mentorship networks connecting successful women leaders with emerging entrepreneurs. The program addresses structural barriers through advocacy for policy reforms, combating gender-based violence, and promoting women\'s land rights. Special focus is given to reaching marginalized women including those with disabilities, ethnic minorities, and survivors of violence.</p>',
        iati_identifier: 'XI-IATI-DEMO-10007',
        other_identifier: 'WEEL-2024-007',
        activity_status: '2',
        planned_start_date: '2024-05-01',
        planned_end_date: '2028-04-30',
        actual_start_date: '2024-06-01',
        default_currency: 'USD',
        default_finance_type: '110',
        default_aid_type: '15170',
        default_tied_status: '5',
        hierarchy: 1,
        reporting_org_id: orgs[4]?.id || orgs[0].id,
        created_by_org_name: 'UN Women',
        created_by_org_acronym: 'UN Women',
        submission_status: 'validated',
        publication_status: 'published',
        icon: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
        banner: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&h=400&fit=crop'
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
      // Rural Water Supply sectors
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', sector_code: '14031', sector_name: 'Basic drinking water supply', sector_percentage: 40, sector_category_code: '140', sector_category_name: 'Water Supply & Sanitation', category_percentage: 40, type: 'primary' },
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', sector_code: '14032', sector_name: 'Basic sanitation', sector_percentage: 35, sector_category_code: '140', sector_category_name: 'Water Supply & Sanitation', category_percentage: 35, type: 'secondary' },
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', sector_code: '12261', sector_name: 'Health education', sector_percentage: 25, sector_category_code: '122', sector_category_name: 'Basic Health', category_percentage: 25, type: 'secondary' },
      
      // Climate-Smart Agriculture sectors
      { activity_id: 'd4e5f6a7-8901-23de-f456-4567890123ef', sector_code: '31161', sector_name: 'Food crop production', sector_percentage: 35, sector_category_code: '311', sector_category_name: 'Agriculture', category_percentage: 35, type: 'primary' },
      { activity_id: 'd4e5f6a7-8901-23de-f456-4567890123ef', sector_code: '31191', sector_name: 'Agricultural services', sector_percentage: 30, sector_category_code: '311', sector_category_name: 'Agriculture', category_percentage: 30, type: 'secondary' },
      { activity_id: 'd4e5f6a7-8901-23de-f456-4567890123ef', sector_code: '41081', sector_name: 'Environmental education/training', sector_percentage: 35, sector_category_code: '410', sector_category_name: 'General environmental protection', category_percentage: 35, type: 'secondary' },
      
      // Inclusive Education sectors
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', sector_code: '11220', sector_name: 'Primary education', sector_percentage: 40, sector_category_code: '112', sector_category_name: 'Basic Education', category_percentage: 40, type: 'primary' },
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', sector_code: '11240', sector_name: 'Early childhood education', sector_percentage: 30, sector_category_code: '112', sector_category_name: 'Basic Education', category_percentage: 30, type: 'secondary' },
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', sector_code: '22040', sector_name: 'Information and communication technology', sector_percentage: 30, sector_category_code: '220', sector_category_name: 'Communications', category_percentage: 30, type: 'secondary' },
      
      // Urban Resilience sectors
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', sector_code: '43030', sector_name: 'Urban development and management', sector_percentage: 40, sector_category_code: '430', sector_category_name: 'Other Multisector', category_percentage: 40, type: 'primary' },
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', sector_code: '41010', sector_name: 'Environmental policy and administrative management', sector_percentage: 30, sector_category_code: '410', sector_category_name: 'General environmental protection', category_percentage: 30, type: 'secondary' },
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', sector_code: '21030', sector_name: 'Rail transport', sector_percentage: 30, sector_category_code: '210', sector_category_name: 'Transport & Storage', category_percentage: 30, type: 'secondary' },
      
      // Women's Economic Empowerment sectors
      { activity_id: 'a7b8c9d0-1234-56ab-c789-7890123456cd', sector_code: '15170', sector_name: 'Women\'s rights organisations and movements', sector_percentage: 40, sector_category_code: '151', sector_category_name: 'Government & Civil Society-general', category_percentage: 40, type: 'primary' },
      { activity_id: 'a7b8c9d0-1234-56ab-c789-7890123456cd', sector_code: '25010', sector_name: 'Business support services', sector_percentage: 35, sector_category_code: '250', sector_category_name: 'Business & Other Services', category_percentage: 35, type: 'secondary' },
      { activity_id: 'a7b8c9d0-1234-56ab-c789-7890123456cd', sector_code: '24040', sector_name: 'Informal/semi-formal financial intermediaries', sector_percentage: 25, sector_category_code: '240', sector_category_name: 'Banking & Financial Services', category_percentage: 25, type: 'secondary' }
    ];

    await supabase.from('activity_sectors').insert(sectors);

    // Create SDG mappings
    const sdgMappings = [
      // Rural Water Supply SDGs
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', sdg_goal: 6, sdg_target: '6.1', contribution_percent: 40, notes: 'Universal and equitable access to safe drinking water' },
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', sdg_goal: 6, sdg_target: '6.2', contribution_percent: 35, notes: 'Access to adequate sanitation and hygiene' },
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', sdg_goal: 3, sdg_target: '3.3', contribution_percent: 25, notes: 'Combat water-borne diseases' },
      
      // Climate-Smart Agriculture SDGs
      { activity_id: 'd4e5f6a7-8901-23de-f456-4567890123ef', sdg_goal: 2, sdg_target: '2.3', contribution_percent: 35, notes: 'Double agricultural productivity of small-scale food producers' },
      { activity_id: 'd4e5f6a7-8901-23de-f456-4567890123ef', sdg_goal: 2, sdg_target: '2.4', contribution_percent: 35, notes: 'Sustainable food production systems' },
      { activity_id: 'd4e5f6a7-8901-23de-f456-4567890123ef', sdg_goal: 13, sdg_target: '13.1', contribution_percent: 30, notes: 'Strengthen resilience to climate-related hazards' },
      
      // Inclusive Education SDGs
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', sdg_goal: 4, sdg_target: '4.1', contribution_percent: 40, notes: 'Free, equitable and quality primary and secondary education' },
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', sdg_goal: 4, sdg_target: '4.5', contribution_percent: 30, notes: 'Eliminate gender disparities in education' },
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', sdg_goal: 4, sdg_target: '4.a', contribution_percent: 30, notes: 'Build and upgrade education facilities' },
      
      // Urban Resilience SDGs
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', sdg_goal: 11, sdg_target: '11.1', contribution_percent: 35, notes: 'Access to adequate, safe and affordable housing' },
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', sdg_goal: 11, sdg_target: '11.6', contribution_percent: 35, notes: 'Reduce environmental impact of cities' },
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', sdg_goal: 13, sdg_target: '13.1', contribution_percent: 30, notes: 'Strengthen resilience to climate-related hazards' },
      
      // Women's Economic Empowerment SDGs
      { activity_id: 'a7b8c9d0-1234-56ab-c789-7890123456cd', sdg_goal: 5, sdg_target: '5.5', contribution_percent: 40, notes: 'Women\'s full participation and equal opportunities for leadership' },
      { activity_id: 'a7b8c9d0-1234-56ab-c789-7890123456cd', sdg_goal: 5, sdg_target: '5.a', contribution_percent: 30, notes: 'Equal rights to economic resources' },
      { activity_id: 'a7b8c9d0-1234-56ab-c789-7890123456cd', sdg_goal: 8, sdg_target: '8.3', contribution_percent: 30, notes: 'Promote development-oriented policies that support productive activities' }
    ];

    await supabase.from('activity_sdg_mappings').insert(sdgMappings);

    // Create budgets for all projects
    const budgets = [
      // Rural Water Supply budgets (5 years, $85M total)
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', budget_type: 'Original', budget_status: 'Indicative', period_start: '2024-04-01', period_end: '2025-03-31', value_amount: 20000000, value_currency: 'USD', value_date: '2024-03-01' },
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', budget_type: 'Original', budget_status: 'Indicative', period_start: '2025-04-01', period_end: '2026-03-31', value_amount: 22000000, value_currency: 'USD', value_date: '2024-03-01' },
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', budget_type: 'Original', budget_status: 'Indicative', period_start: '2026-04-01', period_end: '2027-03-31', value_amount: 18000000, value_currency: 'USD', value_date: '2024-03-01' },
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', budget_type: 'Original', budget_status: 'Indicative', period_start: '2027-04-01', period_end: '2028-03-31', value_amount: 15000000, value_currency: 'USD', value_date: '2024-03-01' },
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', budget_type: 'Original', budget_status: 'Indicative', period_start: '2028-04-01', period_end: '2029-03-31', value_amount: 10000000, value_currency: 'USD', value_date: '2024-03-01' },
      
      // Climate-Smart Agriculture budgets (4 years, $75M total)
      { activity_id: 'd4e5f6a7-8901-23de-f456-4567890123ef', budget_type: 'Original', budget_status: 'Indicative', period_start: '2024-06-01', period_end: '2025-05-31', value_amount: 18000000, value_currency: 'USD', value_date: '2024-05-01' },
      { activity_id: 'd4e5f6a7-8901-23de-f456-4567890123ef', budget_type: 'Original', budget_status: 'Indicative', period_start: '2025-06-01', period_end: '2026-05-31', value_amount: 22000000, value_currency: 'USD', value_date: '2024-05-01' },
      { activity_id: 'd4e5f6a7-8901-23de-f456-4567890123ef', budget_type: 'Original', budget_status: 'Indicative', period_start: '2026-06-01', period_end: '2027-05-31', value_amount: 20000000, value_currency: 'USD', value_date: '2024-05-01' },
      { activity_id: 'd4e5f6a7-8901-23de-f456-4567890123ef', budget_type: 'Original', budget_status: 'Indicative', period_start: '2027-06-01', period_end: '2028-05-31', value_amount: 15000000, value_currency: 'USD', value_date: '2024-05-01' },
      
      // Inclusive Education budgets (5 years, $120M total)
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', budget_type: 'Original', budget_status: 'Indicative', period_start: '2024-09-01', period_end: '2025-08-31', value_amount: 25000000, value_currency: 'USD', value_date: '2024-08-01' },
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', budget_type: 'Original', budget_status: 'Indicative', period_start: '2025-09-01', period_end: '2026-08-31', value_amount: 28000000, value_currency: 'USD', value_date: '2024-08-01' },
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', budget_type: 'Original', budget_status: 'Indicative', period_start: '2026-09-01', period_end: '2027-08-31', value_amount: 26000000, value_currency: 'USD', value_date: '2024-08-01' },
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', budget_type: 'Original', budget_status: 'Indicative', period_start: '2027-09-01', period_end: '2028-08-31', value_amount: 23000000, value_currency: 'USD', value_date: '2024-08-01' },
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', budget_type: 'Original', budget_status: 'Indicative', period_start: '2028-09-01', period_end: '2029-08-31', value_amount: 18000000, value_currency: 'USD', value_date: '2024-08-01' },
      
      // Urban Resilience budgets (5 years, $150M total)
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', budget_type: 'Original', budget_status: 'Indicative', period_start: '2024-07-01', period_end: '2025-06-30', value_amount: 30000000, value_currency: 'USD', value_date: '2024-06-01' },
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', budget_type: 'Original', budget_status: 'Indicative', period_start: '2025-07-01', period_end: '2026-06-30', value_amount: 35000000, value_currency: 'USD', value_date: '2024-06-01' },
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', budget_type: 'Original', budget_status: 'Indicative', period_start: '2026-07-01', period_end: '2027-06-30', value_amount: 32000000, value_currency: 'USD', value_date: '2024-06-01' },
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', budget_type: 'Original', budget_status: 'Indicative', period_start: '2027-07-01', period_end: '2028-06-30', value_amount: 28000000, value_currency: 'USD', value_date: '2024-06-01' },
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', budget_type: 'Original', budget_status: 'Indicative', period_start: '2028-07-01', period_end: '2029-06-30', value_amount: 25000000, value_currency: 'USD', value_date: '2024-06-01' },
      
      // Women's Economic Empowerment budgets (4 years, $60M total)
      { activity_id: 'a7b8c9d0-1234-56ab-c789-7890123456cd', budget_type: 'Original', budget_status: 'Indicative', period_start: '2024-05-01', period_end: '2025-04-30', value_amount: 15000000, value_currency: 'USD', value_date: '2024-04-01' },
      { activity_id: 'a7b8c9d0-1234-56ab-c789-7890123456cd', budget_type: 'Original', budget_status: 'Indicative', period_start: '2025-05-01', period_end: '2026-04-30', value_amount: 18000000, value_currency: 'USD', value_date: '2024-04-01' },
      { activity_id: 'a7b8c9d0-1234-56ab-c789-7890123456cd', budget_type: 'Original', budget_status: 'Indicative', period_start: '2026-05-01', period_end: '2027-04-30', value_amount: 16000000, value_currency: 'USD', value_date: '2024-04-01' },
      { activity_id: 'a7b8c9d0-1234-56ab-c789-7890123456cd', budget_type: 'Original', budget_status: 'Indicative', period_start: '2027-05-01', period_end: '2028-04-30', value_amount: 11000000, value_currency: 'USD', value_date: '2024-04-01' }
    ];

    await supabase.from('activity_budgets').insert(budgets);

    // Create transactions (commitments and some disbursements)
    const transactions = [
      // Rural Water Supply
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', transaction_type: 'Commitment', transaction_date: '2024-04-15', value_amount: 85000000, value_currency: 'USD', value_date: '2024-04-15', description: 'Total program commitment for Rural Water Supply and Sanitation', provider_org_narrative: 'African Development Bank', receiver_org_narrative: 'Ministry of Water Resources' },
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', transaction_type: 'Disbursement', transaction_date: '2024-06-01', value_amount: 5000000, value_currency: 'USD', value_date: '2024-06-01', description: 'Q2 2024 - Initial mobilization and baseline studies', provider_org_narrative: 'African Development Bank', receiver_org_narrative: 'Water Resources Implementation Unit' },
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', transaction_type: 'Disbursement', transaction_date: '2024-09-01', value_amount: 5000000, value_currency: 'USD', value_date: '2024-09-01', description: 'Q3 2024 - Borehole drilling phase 1', provider_org_narrative: 'African Development Bank', receiver_org_narrative: 'Water Resources Implementation Unit' },
      
      // Climate-Smart Agriculture
      { activity_id: 'd4e5f6a7-8901-23de-f456-4567890123ef', transaction_type: 'Commitment', transaction_date: '2024-06-15', value_amount: 75000000, value_currency: 'USD', value_date: '2024-06-15', description: 'Total program commitment for Climate-Smart Agriculture', provider_org_narrative: 'Food and Agriculture Organization', receiver_org_narrative: 'Ministry of Agriculture' },
      { activity_id: 'd4e5f6a7-8901-23de-f456-4567890123ef', transaction_type: 'Disbursement', transaction_date: '2024-08-01', value_amount: 4500000, value_currency: 'USD', value_date: '2024-08-01', description: 'Q3 2024 - Farmer field schools establishment', provider_org_narrative: 'FAO', receiver_org_narrative: 'Agricultural Extension Services' },
      
      // Inclusive Education
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', transaction_type: 'Commitment', transaction_date: '2024-09-15', value_amount: 120000000, value_currency: 'USD', value_date: '2024-09-15', description: 'Total program commitment for Inclusive Education', provider_org_narrative: 'UNICEF', receiver_org_narrative: 'Ministry of Education' },
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', transaction_type: 'Disbursement', transaction_date: '2024-10-15', value_amount: 6000000, value_currency: 'USD', value_date: '2024-10-15', description: 'Q4 2024 - Smart classroom equipment procurement', provider_org_narrative: 'UNICEF', receiver_org_narrative: 'Education Technology Unit' },
      
      // Urban Resilience
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', transaction_type: 'Commitment', transaction_date: '2024-07-15', value_amount: 150000000, value_currency: 'USD', value_date: '2024-07-15', description: 'Total program commitment for Urban Resilience', provider_org_narrative: 'Asian Development Bank', receiver_org_narrative: 'Ministry of Urban Development' },
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', transaction_type: 'Disbursement', transaction_date: '2024-09-01', value_amount: 7500000, value_currency: 'USD', value_date: '2024-09-01', description: 'Q3 2024 - Informal settlement upgrading phase 1', provider_org_narrative: 'ADB', receiver_org_narrative: 'Urban Development Authority' },
      
      // Women's Economic Empowerment
      { activity_id: 'a7b8c9d0-1234-56ab-c789-7890123456cd', transaction_type: 'Commitment', transaction_date: '2024-05-15', value_amount: 60000000, value_currency: 'USD', value_date: '2024-05-15', description: 'Total program commitment for Women\'s Economic Empowerment', provider_org_narrative: 'UN Women', receiver_org_narrative: 'Ministry of Women Affairs' },
      { activity_id: 'a7b8c9d0-1234-56ab-c789-7890123456cd', transaction_type: 'Disbursement', transaction_date: '2024-07-01', value_amount: 3750000, value_currency: 'USD', value_date: '2024-07-01', description: 'Q3 2024 - Business incubation centers setup', provider_org_narrative: 'UN Women', receiver_org_narrative: 'Women\'s Enterprise Development Unit' }
    ];

    await supabase.from('transactions').insert(transactions);

    // Create planned disbursements
    const plannedDisbursements = [
      // Rural Water Supply
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', disbursement_type: 'Outgoing', period_start: '2024-10-01', period_end: '2024-12-31', value_amount: 5000000, value_currency: 'USD', value_date: '2024-10-01', provider_org_narrative: 'Q4 2024 disbursement' },
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', disbursement_type: 'Outgoing', period_start: '2025-01-01', period_end: '2025-03-31', value_amount: 5000000, value_currency: 'USD', value_date: '2025-01-01', provider_org_narrative: 'Q1 2025 disbursement' },
      
      // Climate-Smart Agriculture
      { activity_id: 'd4e5f6a7-8901-23de-f456-4567890123ef', disbursement_type: 'Outgoing', period_start: '2024-10-01', period_end: '2024-12-31', value_amount: 4500000, value_currency: 'USD', value_date: '2024-10-01', provider_org_narrative: 'Q4 2024 disbursement' },
      { activity_id: 'd4e5f6a7-8901-23de-f456-4567890123ef', disbursement_type: 'Outgoing', period_start: '2025-01-01', period_end: '2025-03-31', value_amount: 4500000, value_currency: 'USD', value_date: '2025-01-01', provider_org_narrative: 'Q1 2025 disbursement' },
      
      // Inclusive Education
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', disbursement_type: 'Outgoing', period_start: '2025-01-01', period_end: '2025-03-31', value_amount: 6250000, value_currency: 'USD', value_date: '2025-01-01', provider_org_narrative: 'Q1 2025 disbursement' },
      { activity_id: 'e5f6a7b8-9012-34ef-a567-5678901234ab', disbursement_type: 'Outgoing', period_start: '2025-04-01', period_end: '2025-06-30', value_amount: 6250000, value_currency: 'USD', value_date: '2025-04-01', provider_org_narrative: 'Q2 2025 disbursement' },
      
      // Urban Resilience
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', disbursement_type: 'Outgoing', period_start: '2024-10-01', period_end: '2024-12-31', value_amount: 7500000, value_currency: 'USD', value_date: '2024-10-01', provider_org_narrative: 'Q4 2024 disbursement' },
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', disbursement_type: 'Outgoing', period_start: '2025-01-01', period_end: '2025-03-31', value_amount: 7500000, value_currency: 'USD', value_date: '2025-01-01', provider_org_narrative: 'Q1 2025 disbursement' },
      
      // Women's Economic Empowerment
      { activity_id: 'a7b8c9d0-1234-56ab-c789-7890123456cd', disbursement_type: 'Outgoing', period_start: '2024-10-01', period_end: '2024-12-31', value_amount: 3750000, value_currency: 'USD', value_date: '2024-10-01', provider_org_narrative: 'Q4 2024 disbursement' },
      { activity_id: 'a7b8c9d0-1234-56ab-c789-7890123456cd', disbursement_type: 'Outgoing', period_start: '2025-01-01', period_end: '2025-03-31', value_amount: 3750000, value_currency: 'USD', value_date: '2025-01-01', provider_org_narrative: 'Q1 2025 disbursement' }
    ];

    await supabase.from('activity_planned_disbursements').insert(plannedDisbursements);

    // Add locations for some projects
    const locations = [
      // Rural Water Supply locations
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', location_type: 'site', location_name: 'Western Water Hub', admin_unit: 'Western Province', latitude: -15.4167, longitude: 28.2833, description: 'Main water treatment and distribution center' },
      { activity_id: 'c3d4e5f6-7890-12cd-ef34-3456789012cd', location_type: 'coverage', location_name: 'Rural Districts Coverage', admin_unit: 'Rural Provinces', description: 'Coverage area for rural water supply systems' },
      
      // Urban Resilience locations
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', location_type: 'site', location_name: 'Central City Upgrade Zone', admin_unit: 'Capital City', latitude: -8.8383, longitude: 13.2344, description: 'Main urban renewal and transit development area' },
      { activity_id: 'f6a7b8c9-0123-45fa-b678-6789012345bc', location_type: 'site', location_name: 'Eastern Informal Settlement', admin_unit: 'Eastern District', latitude: -8.9133, longitude: 13.3344, description: 'Informal settlement upgrading site' }
    ];

    await supabase.from('activity_locations').insert(locations);

    console.log('5 comprehensive projects created successfully!');
    
  } catch (error) {
    console.error('Error creating projects:', error);
  }
}

// Run the script
createFiveProjects();