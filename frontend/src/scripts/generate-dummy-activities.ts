import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// IATI Code Lists
const AID_TYPES = ['A01', 'A02', 'B01', 'B02', 'B03', 'B04', 'C01', 'D01', 'D02', 'E01', 'E02', 'F01', 'G01']
const FINANCE_TYPES = ['110', '210', '310', '410', '420', '510', '610', '710', '810', '910']
const ACTIVITY_STATUSES = ['1', '2', '3', '4', '5', '6'] // Pipeline, Implementation, Completion, etc.
const COLLABORATION_TYPES = ['1', '2', '3', '4'] // Bilateral, Multilateral, etc.
const FLOW_TYPES = ['10', '20', '30', '35', '40', '50'] // ODA, OOF, etc.
const TIED_STATUSES = ['1', '2', '3', '4', '5'] // Tied, Untied, etc.
const TRANSACTION_TYPES = ['1', '2', '3', '4', '5', '6', '7', '8', '11', '12', '13'] // Incoming, Commitment, Disbursement, etc.

// DAC 5-digit sector codes (selection of common ones for Myanmar)
const SECTOR_CODES = [
  { code: '11110', name: 'Education policy and administrative management' },
  { code: '11220', name: 'Primary education' },
  { code: '11320', name: 'Upper secondary education' },
  { code: '12110', name: 'Health policy and administrative management' },
  { code: '12220', name: 'Basic health care' },
  { code: '12261', name: 'Health education' },
  { code: '13020', name: 'Reproductive health care' },
  { code: '14010', name: 'Water sector policy and administrative management' },
  { code: '14030', name: 'Basic drinking water supply and basic sanitation' },
  { code: '15110', name: 'Public sector policy and administrative management' },
  { code: '15150', name: 'Democratic participation and civil society' },
  { code: '16010', name: 'Social protection' },
  { code: '16050', name: 'Multisector aid for basic social services' },
  { code: '31110', name: 'Agricultural policy and administrative management' },
  { code: '31120', name: 'Agricultural development' },
  { code: '31161', name: 'Food crop production' },
  { code: '32130', name: 'Small and medium-sized enterprises (SME) development' },
  { code: '43010', name: 'Multisector aid' },
  { code: '43040', name: 'Rural development' },
  { code: '73010', name: 'Immediate post-emergency reconstruction and rehabilitation' }
]

// Policy markers / tags
const POLICY_MARKERS = [
  { code: '1', name: 'Gender Equality' },
  { code: '2', name: 'Aid to Environment' },
  { code: '3', name: 'Participatory Development/Good Governance' },
  { code: '4', name: 'Trade Development' },
  { code: '5', name: 'Aid Targeting the Objectives of the Convention on Biological Diversity' },
  { code: '6', name: 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Mitigation' },
  { code: '7', name: 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Adaptation' },
  { code: '8', name: 'Aid Targeting the Objectives of the Convention to Combat Desertification' },
  { code: '9', name: 'Reproductive, Maternal, Newborn and Child Health (RMNCH)' }
]

// Myanmar administrative regions
const MYANMAR_LOCATIONS = [
  { name: 'Yangon Region', code: 'MM-06' },
  { name: 'Mandalay Region', code: 'MM-04' },
  { name: 'Sagaing Region', code: 'MM-01' },
  { name: 'Bago Region', code: 'MM-02' },
  { name: 'Magway Region', code: 'MM-03' },
  { name: 'Tanintharyi Region', code: 'MM-05' },
  { name: 'Ayeyarwady Region', code: 'MM-07' },
  { name: 'Kachin State', code: 'MM-11' },
  { name: 'Kayah State', code: 'MM-12' },
  { name: 'Kayin State', code: 'MM-13' },
  { name: 'Chin State', code: 'MM-14' },
  { name: 'Mon State', code: 'MM-15' },
  { name: 'Rakhine State', code: 'MM-16' },
  { name: 'Shan State', code: 'MM-17' }
]

// Sample organizations (mix of bilateral, multilateral, and NGOs)
const SAMPLE_ORGS = [
  { name: 'United States Agency for International Development', acronym: 'USAID', iati_id: 'US-1', type: '10' },
  { name: 'Department for International Development', acronym: 'DFID', iati_id: 'GB-1', type: '10' },
  { name: 'Japan International Cooperation Agency', acronym: 'JICA', iati_id: 'JP-1', type: '10' },
  { name: 'World Bank', acronym: 'WB', iati_id: '44000', type: '40' },
  { name: 'Asian Development Bank', acronym: 'ADB', iati_id: '46004', type: '40' },
  { name: 'United Nations Development Programme', acronym: 'UNDP', iati_id: '41114', type: '40' },
  { name: 'United Nations Children\'s Fund', acronym: 'UNICEF', iati_id: '41122', type: '40' },
  { name: 'Save the Children International', acronym: 'SCI', iati_id: 'GB-COH-03422296', type: '21' },
  { name: 'Oxfam International', acronym: 'Oxfam', iati_id: 'GB-CHC-202918', type: '21' },
  { name: 'CARE International', acronym: 'CARE', iati_id: 'US-EIN-131685039', type: '21' },
  { name: 'Myanmar Red Cross Society', acronym: 'MRCS', iati_id: 'MM-MRCS', type: '23' },
  { name: 'Community Partners International', acronym: 'CPI', iati_id: 'US-EIN-943390721', type: '23' }
]

async function getOrCreateOrganizations() {
  console.log('🏢 Setting up organizations...')
  
  for (const org of SAMPLE_ORGS) {
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('iati_org_id', org.iati_id)
      .single()
    
    if (!existing) {
      const { error } = await supabase
        .from('organizations')
        .insert({
          name: org.name,
          acronym: org.acronym,
          // full_name removed - using name field only
          iati_org_id: org.iati_id,
          organisation_type: org.type,
          country_represented: org.type === '40' ? 'Global or Regional' : faker.helpers.arrayElement(['US', 'GB', 'JP', 'DE', 'FR', 'CA', 'AU'])
        })
      
      if (error) {
        console.error(`Error creating organization ${org.name}:`, error)
      } else {
        console.log(`✅ Created organization: ${org.name}`)
      }
    }
  }
  
  // Fetch all organizations for use in activities
  const { data: organizations } = await supabase
    .from('organizations')
    .select('*')
  
  return organizations || []
}

async function generateActivity(index: number, organizations: any[]) {
  const reportingOrg = faker.helpers.arrayElement(organizations.filter(o => ['10', '40', '21'].includes(o.organisation_type)))
  const startDate = faker.date.between({ from: '2021-01-01', to: '2023-12-31' })
  const endDate = faker.date.between({ from: '2024-01-01', to: '2028-12-31' })
  
  const activityData = {
    iati_id: `${reportingOrg.iati_org_id}-ACT${String(index).padStart(5, '0')}`,
    title: faker.helpers.arrayElement([
      `Strengthening ${faker.helpers.arrayElement(['Health', 'Education', 'Water', 'Agriculture'])} Systems in ${faker.helpers.arrayElement(MYANMAR_LOCATIONS).name}`,
      `${faker.helpers.arrayElement(['Rural', 'Urban', 'Community'])} Development Initiative for ${faker.helpers.arrayElement(['Youth', 'Women', 'Farmers', 'SMEs'])}`,
      `${faker.helpers.arrayElement(['Emergency', 'Disaster', 'Climate'])} Response and ${faker.helpers.arrayElement(['Preparedness', 'Resilience', 'Recovery'])} Program`,
      `Capacity Building for ${faker.helpers.arrayElement(['Local Government', 'Civil Society', 'Private Sector'])} in Myanmar`,
      `Improving ${faker.helpers.arrayElement(['Maternal Health', 'Food Security', 'Water Access', 'Education Quality'])} in ${faker.helpers.arrayElement(['Conflict-Affected', 'Rural', 'Remote'])} Areas`
    ]),
    description: faker.lorem.paragraphs(3),
    activity_status: faker.helpers.weightedArrayElement([
      { value: '2', weight: 60 }, // Implementation (most common)
      { value: '1', weight: 20 }, // Pipeline
      { value: '3', weight: 10 }, // Completion
      { value: '4', weight: 10 }  // Post-completion
    ]),
    collaboration_type: faker.helpers.arrayElement(COLLABORATION_TYPES),
    planned_start_date: startDate.toISOString().split('T')[0],
    actual_start_date: faker.datatype.boolean(0.7) ? faker.date.between({ from: startDate, to: new Date() }).toISOString().split('T')[0] : null,
    planned_end_date: endDate.toISOString().split('T')[0],
    actual_end_date: null,
    created_by_org: reportingOrg.id
  }
  
  console.log(`📝 Creating activity ${index + 1}/20: ${activityData.title}`)
  
  const { data: activity, error } = await supabase
    .from('activities')
    .insert(activityData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating activity:', error)
    return null
  }
  
  return activity
}

async function generateTransactions(activityId: string, organizations: any[]) {
  const transactionCount = faker.number.int({ min: 15, max: 35 })
  console.log(`   💰 Generating ${transactionCount} transactions...`)
  
  for (let i = 0; i < transactionCount; i++) {
    // Use only basic transaction types that likely exist
    const transactionType = faker.helpers.arrayElement(['commitment', 'disbursement', 'expenditure'])
    
    const provider = faker.helpers.arrayElement(organizations.filter(o => ['10', '40'].includes(o.organisation_type)))
    const receiver = faker.helpers.arrayElement(organizations.filter(o => ['21', '23'].includes(o.organisation_type)))
    
    const transactionData = {
      activity_id: activityId,
      transaction_type: transactionType,
      transaction_date: faker.date.between({ from: '2021-01-01', to: new Date() }).toISOString().split('T')[0],
      value: faker.number.float({ min: 10000, max: 5000000, fractionDigits: 2 }),
      currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'JPY']),
      description: faker.helpers.arrayElement([
        'Quarterly disbursement',
        'Annual commitment',
        'Project implementation costs',
        'Equipment and supplies',
        'Training and capacity building',
        'Infrastructure development',
        'Emergency response funding'
      ])
    }
    
    const { error } = await supabase
      .from('activity_transactions')
      .insert(transactionData)
    
    if (error) {
      console.error('Error creating transaction:', error)
    }
  }
}

async function generateSectors(activityId: string) {
  const sectorCount = faker.number.int({ min: 1, max: 3 })
  const selectedSectors = faker.helpers.arrayElements(SECTOR_CODES, sectorCount)
  console.log(`   🏷️  Adding ${sectorCount} sectors...`)
  
  let totalPercentage = 0
  const sectorData = selectedSectors.map((sector, index) => {
    let percentage: number
    if (index === selectedSectors.length - 1) {
      percentage = 100 - totalPercentage
    } else {
      percentage = faker.number.int({ min: 20, max: Math.min(60, 100 - totalPercentage - (selectedSectors.length - index - 1) * 10) })
      totalPercentage += percentage
    }
    
    return {
      activity_id: activityId,
      sector_code: sector.code,
      percentage,
      narrative: sector.name,
      vocabulary: '1', // OECD DAC
      vocabulary_uri: 'http://www.oecd.org/dac/stats/dacandcrscodelists.htm'
    }
  })
  
  for (const sector of sectorData) {
    const { error } = await supabase
      .from('activity_sectors')
      .insert(sector)
    
    if (error) {
      console.error('Error creating sector:', error)
    }
  }
}

async function generatePolicyMarkers(activityId: string) {
  const markerCount = faker.number.int({ min: 1, max: 4 })
  const selectedMarkers = faker.helpers.arrayElements(POLICY_MARKERS, markerCount)
  console.log(`   🎯 Adding ${markerCount} policy markers...`)
  
  for (const marker of selectedMarkers) {
    const { error } = await supabase
      .from('activity_policy_markers')
      .insert({
        activity_id: activityId,
        policy_marker: marker.code,
        significance: faker.helpers.arrayElement(['0', '1', '2', '3']), // Not targeted, Significant, Principal, etc.
        narrative: marker.name,
        vocabulary: '1',
        vocabulary_uri: 'http://www.oecd.org/dac/stats/dacandcrscodelists.htm'
      })
    
    if (error) {
      console.error('Error creating policy marker:', error)
    }
  }
}

async function generateParticipatingOrgs(activityId: string, organizations: any[]) {
  console.log(`   👥 Adding participating organizations...`)
  
  // Add 2-5 participating orgs with different roles
  const participatingCount = faker.number.int({ min: 2, max: 5 })
  const selectedOrgs = faker.helpers.arrayElements(organizations, participatingCount)
  
  for (let i = 0; i < selectedOrgs.length; i++) {
    const org = selectedOrgs[i]
    const role = i === 0 ? '1' : faker.helpers.arrayElement(['2', '3', '4']) // First is funding, others varied
    
    const { error } = await supabase
      .from('activity_participating_orgs')
      .insert({
        activity_id: activityId,
        organisation_id: org.id,
        organisation_role: role,
        organisation_type: org.organisation_type,
        narrative: org.name,
        ref: org.iati_org_id,
        crs_channel_code: faker.helpers.arrayElement(['10000', '20000', '30000', '40000', '50000'])
      })
    
    if (error) {
      console.error('Error creating participating org:', error)
    }
  }
}

async function generateLocations(activityId: string) {
  const locationCount = faker.number.int({ min: 1, max: 4 })
  const selectedLocations = faker.helpers.arrayElements(MYANMAR_LOCATIONS, locationCount)
  console.log(`   📍 Adding ${locationCount} locations...`)
  
  for (const location of selectedLocations) {
    const { error } = await supabase
      .from('activity_locations')
      .insert({
        activity_id: activityId,
        location_reach: faker.helpers.arrayElement(['1', '2']), // Activity, Intended beneficiaries
        location_code: location.code,
        name: location.name,
        description: faker.lorem.sentence(),
        activity_description: faker.lorem.paragraph(),
        administrative_level: '1',
        administrative_code: location.code,
        administrative_vocabulary: 'G1',
        exactness: faker.helpers.arrayElement(['1', '2', '3', '4']),
        location_class: faker.helpers.arrayElement(['1', '2', '3', '4']),
        feature_designation: faker.helpers.arrayElement(['PCLI', 'ADM1', 'PPL', 'PPLA'])
      })
    
    if (error) {
      console.error('Error creating location:', error)
    }
  }
}

async function generateTags(activityId: string) {
  // Generate custom working group tags
  const tagCount = faker.number.int({ min: 1, max: 3 })
  const workingGroups = [
    'Health Sector Coordination',
    'Education Cluster',
    'WASH Working Group',
    'Food Security Cluster',
    'Shelter/NFI Cluster',
    'Protection Cluster',
    'Nutrition Cluster',
    'Early Recovery Network',
    'Gender in Humanitarian Action',
    'Cash Working Group'
  ]
  
  const selectedTags = faker.helpers.arrayElements(workingGroups, tagCount)
  console.log(`   🏷️  Adding ${tagCount} working group tags...`)
  
  for (const tag of selectedTags) {
    const { error } = await supabase
      .from('activity_tags')
      .insert({
        activity_id: activityId,
        tag_code: tag.toLowerCase().replace(/\s+/g, '-'),
        narrative: tag,
        vocabulary: '99', // User-defined
        vocabulary_uri: null
      })
    
    if (error) {
      console.error('Error creating tag:', error)
    }
  }
}

async function generateBudgets(activityId: string) {
  const budgetCount = faker.number.int({ min: 1, max: 3 })
  console.log(`   💵 Adding ${budgetCount} budgets...`)
  
  for (let i = 0; i < budgetCount; i++) {
    const startDate = faker.date.between({ from: '2024-01-01', to: '2025-12-31' })
    const endDate = faker.date.between({ from: startDate, to: '2028-12-31' })
    
    const { error } = await supabase
      .from('activity_budgets')
      .insert({
        activity_id: activityId,
        budget_type: faker.helpers.arrayElement(['1', '2']), // Original, Revised
        budget_status: faker.helpers.arrayElement(['1', '2']), // Indicative, Committed
        period_start: startDate.toISOString().split('T')[0],
        period_end: endDate.toISOString().split('T')[0],
        value: faker.number.float({ min: 100000, max: 10000000, fractionDigits: 2 }),
        currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP']),
        narrative: faker.helpers.arrayElement(['Annual budget', 'Revised budget', 'Multi-year budget allocation'])
      })
    
    if (error) {
      console.error('Error creating budget:', error)
    }
  }
}

async function main() {
  console.log('🚀 Starting Myanmar AIMS dummy data generation...')
  console.log('=' .repeat(50))
  
  try {
    // Step 1: Set up organizations
    const organizations = await getOrCreateOrganizations()
    console.log(`\n✅ Organizations ready: ${organizations.length} total`)
    
    // Step 2: Generate 20 activities with comprehensive data
    console.log('\n📊 Generating 20 Myanmar aid activities...\n')
    
    for (let i = 0; i < 20; i++) {
      const activity = await generateActivity(i, organizations)
      
      if (activity) {
        // Generate all related data for each activity
        await generateTransactions(activity.id, organizations)
        await generateSectors(activity.id)
        await generatePolicyMarkers(activity.id)
        await generateParticipatingOrgs(activity.id, organizations)
        await generateLocations(activity.id)
        await generateTags(activity.id)
        await generateBudgets(activity.id)
        
        console.log(`   ✅ Activity ${i + 1} complete: ${activity.iati_id}\n`)
      }
    }
    
    console.log('=' .repeat(50))
    console.log('🎉 Data generation complete!')
    console.log('\nYou now have:')
    console.log('- 20 Myanmar aid activities')
    console.log('- 300-700 transactions across all activities')
    console.log('- Comprehensive IATI fields populated')
    console.log('- Multiple sectors, tags, and participating orgs per activity')
    console.log('\n✨ Your Gantt charts and reports should now have rich data!')
    
  } catch (error) {
    console.error('❌ Error during data generation:', error)
  }
  
  process.exit(0)
}

// Run the script
main() 