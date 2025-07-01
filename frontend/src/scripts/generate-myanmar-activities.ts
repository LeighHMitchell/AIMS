import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { writeFileSync } from 'fs'

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

// IATI Code Lists - Using standard IATI values
const AID_TYPES = [
  { code: 'A01', name: 'General budget support' },
  { code: 'A02', name: 'Sector budget support' },
  { code: 'B01', name: 'Core support to NGOs, other private bodies, PPPs and research institutes' },
  { code: 'B02', name: 'Core contributions to multilateral institutions' },
  { code: 'B03', name: 'Contributions to specific-purpose programmes and funds managed by implementing partners' },
  { code: 'B04', name: 'Basket funds/pooled funding' },
  { code: 'C01', name: 'Project-type interventions' },
  { code: 'D01', name: 'Donor country personnel' },
  { code: 'D02', name: 'Other technical assistance' },
  { code: 'E01', name: 'Scholarships/training in donor country' },
  { code: 'E02', name: 'Imputed student costs' },
  { code: 'F01', name: 'Debt relief' },
  { code: 'G01', name: 'Administrative costs not included elsewhere' }
]

const FLOW_TYPES = [
  { code: '10', name: 'ODA' },
  { code: '20', name: 'OOF' },
  { code: '30', name: 'Private grants' },
  { code: '35', name: 'Private market' },
  { code: '40', name: 'Non flow' },
  { code: '50', name: 'Other flows' }
]

const FINANCE_TYPES = [
  { code: '110', name: 'Standard grant' },
  { code: '210', name: 'Interest subsidy' },
  { code: '310', name: 'Capital subscription on deposit basis' },
  { code: '311', name: 'Capital subscription on encashment basis' },
  { code: '410', name: 'Aid loan excluding debt reorganisation' },
  { code: '411', name: 'Investment-related loan to developing countries' },
  { code: '412', name: 'Loan in a joint venture with the recipient' },
  { code: '413', name: 'Loan to national private investor' },
  { code: '414', name: 'Loan to national private exporter' },
  { code: '421', name: 'Standard loan' },
  { code: '422', name: 'Reimbursable grant' },
  { code: '423', name: 'Bonds' },
  { code: '424', name: 'Asset-backed securities' },
  { code: '425', name: 'Other debt securities' },
  { code: '510', name: 'Common equity' },
  { code: '511', name: 'Acquisition of equity not part of joint venture in developing countries' },
  { code: '512', name: 'Other acquisition of equity' },
  { code: '520', name: 'Shares in collective investment vehicles' },
  { code: '610', name: 'Debt forgiveness' },
  { code: '611', name: 'Debt forgiveness: ODA claims' },
  { code: '612', name: 'Debt forgiveness: OOF claims' },
  { code: '613', name: 'Debt forgiveness: Private claims' },
  { code: '614', name: 'Debt forgiveness for military debt' },
  { code: '615', name: 'Other debt forgiveness' },
  { code: '616', name: 'Debt forgiveness on interest' },
  { code: '617', name: 'Debt forgiveness on principal' },
  { code: '618', name: 'Debt forgiveness: export credit claims' },
  { code: '620', name: 'Debt rescheduling' },
  { code: '621', name: 'Debt rescheduling: ODA claims' },
  { code: '622', name: 'Debt rescheduling: OOF claims' },
  { code: '623', name: 'Debt rescheduling: Private claims' },
  { code: '624', name: 'Debt rescheduling: export credit claims' },
  { code: '625', name: 'Debt rescheduling: interest' },
  { code: '626', name: 'Debt rescheduling: principal' },
  { code: '627', name: 'Debt rescheduling: principal and interest' },
  { code: '630', name: 'Debt swap' },
  { code: '631', name: 'Debt buyback' },
  { code: '632', name: 'Other debt' }
]

const ACTIVITY_STATUSES = [
  { code: '1', name: 'Pipeline/identification' },
  { code: '2', name: 'Implementation' },
  { code: '3', name: 'Finalisation' },
  { code: '4', name: 'Closed' },
  { code: '5', name: 'Cancelled' },
  { code: '6', name: 'Suspended' }
]

// DAC 5-digit sector codes relevant for Myanmar
const SECTOR_CODES = [
  { code: '11110', name: 'Education policy and administrative management' },
  { code: '11120', name: 'Education facilities and training' },
  { code: '11130', name: 'Teacher training' },
  { code: '11220', name: 'Primary education' },
  { code: '11230', name: 'Basic life skills for youth and adults' },
  { code: '11240', name: 'Early childhood education' },
  { code: '11320', name: 'Secondary education' },
  { code: '11330', name: 'Vocational training' },
  { code: '12110', name: 'Health policy and administrative management' },
  { code: '12191', name: 'Medical services' },
  { code: '12220', name: 'Basic health care' },
  { code: '12230', name: 'Basic health infrastructure' },
  { code: '12240', name: 'Basic nutrition' },
  { code: '12250', name: 'Infectious disease control' },
  { code: '12261', name: 'Health education' },
  { code: '12281', name: 'Health personnel development' },
  { code: '13020', name: 'Reproductive health care' },
  { code: '13030', name: 'Family planning' },
  { code: '13040', name: 'STD control including HIV/AIDS' },
  { code: '13081', name: 'Personnel development for population and reproductive health' },
  { code: '14010', name: 'Water sector policy and administrative management' },
  { code: '14015', name: 'Water resources conservation (including data collection)' },
  { code: '14020', name: 'Water supply and sanitation - large systems' },
  { code: '14021', name: 'Water supply - large systems' },
  { code: '14022', name: 'Sanitation - large systems' },
  { code: '14030', name: 'Basic drinking water supply and basic sanitation' },
  { code: '14031', name: 'Basic drinking water supply' },
  { code: '14032', name: 'Basic sanitation' },
  { code: '14040', name: 'River basins development' },
  { code: '14050', name: 'Waste management/disposal' },
  { code: '14081', name: 'Education and training in water supply and sanitation' },
  { code: '15110', name: 'Public sector policy and administrative management' },
  { code: '15111', name: 'Public finance management (PFM)' },
  { code: '15112', name: 'Decentralisation and support to subnational government' },
  { code: '15113', name: 'Anti-corruption organisations and institutions' },
  { code: '15114', name: 'Domestic revenue mobilisation' },
  { code: '15117', name: 'Budget planning' },
  { code: '15150', name: 'Democratic participation and civil society' },
  { code: '15151', name: 'Elections' },
  { code: '15152', name: 'Legislatures and political parties' },
  { code: '15153', name: 'Media and free flow of information' },
  { code: '15160', name: 'Human rights' },
  { code: '15170', name: "Women's rights organisations and movements, and government institutions" },
  { code: '15180', name: 'Ending violence against women and girls' },
  { code: '16010', name: 'Social protection' },
  { code: '16011', name: 'Social protection and welfare services policy, planning and administration' },
  { code: '16012', name: 'Social security (excl pensions)' },
  { code: '16013', name: 'General pensions' },
  { code: '16014', name: 'Civil service pensions' },
  { code: '16015', name: 'Social services (incl youth development and women+ children)' },
  { code: '16020', name: 'Employment creation' },
  { code: '16030', name: 'Housing policy and administrative management' },
  { code: '16040', name: 'Low-cost housing' },
  { code: '16050', name: 'Multisector aid for basic social services' },
  { code: '31110', name: 'Agricultural policy and administrative management' },
  { code: '31120', name: 'Agricultural development' },
  { code: '31130', name: 'Agricultural land resources' },
  { code: '31140', name: 'Agricultural water resources' },
  { code: '31150', name: 'Agricultural inputs' },
  { code: '31161', name: 'Food crop production' },
  { code: '31162', name: 'Industrial crops/export crops' },
  { code: '31163', name: 'Livestock' },
  { code: '31164', name: 'Agrarian reform' },
  { code: '31165', name: 'Agricultural alternative development' },
  { code: '31166', name: 'Agricultural extension' },
  { code: '31181', name: 'Agricultural education/training' },
  { code: '31182', name: 'Agricultural research' },
  { code: '31191', name: 'Agricultural services' },
  { code: '31192', name: 'Plant and post-harvest protection and pest control' },
  { code: '31193', name: 'Agricultural financial services' },
  { code: '31194', name: 'Agricultural co-operatives' },
  { code: '31195', name: 'Livestock/veterinary services' },
  { code: '32130', name: 'Small and medium-sized enterprises (SME) development' },
  { code: '43010', name: 'Multisector aid' },
  { code: '43040', name: 'Rural development' },
  { code: '43050', name: 'Non-agricultural alternative development' },
  { code: '43060', name: 'Disaster Risk Reduction' },
  { code: '43071', name: 'Food security policy and administrative management' },
  { code: '43072', name: 'Household food security programmes' },
  { code: '43073', name: 'Food safety and quality' },
  { code: '43081', name: 'Multisector education/training' },
  { code: '43082', name: 'Research/scientific institutions' },
  { code: '72010', name: 'Material relief assistance and services' },
  { code: '72040', name: 'Emergency food assistance' },
  { code: '72050', name: 'Relief co-ordination and support services' },
  { code: '73010', name: 'Immediate post-emergency reconstruction and rehabilitation' },
  { code: '74020', name: 'Multi-hazard response preparedness' }
]

// Myanmar states and regions
const MYANMAR_LOCATIONS = [
  'Yangon Region', 'Mandalay Region', 'Sagaing Region', 'Bago Region',
  'Magway Region', 'Tanintharyi Region', 'Ayeyarwady Region',
  'Kachin State', 'Kayah State', 'Kayin State', 'Chin State',
  'Mon State', 'Rakhine State', 'Shan State', 'Naypyidaw Union Territory'
]

// Target groups (job roles)
const TARGET_GROUPS = [
  'Health Workers', 'Teachers', 'Farmers', 'Students', 'Women Entrepreneurs',
  'Youth Leaders', 'Community Health Volunteers', 'Agricultural Extension Workers',
  'Small Business Owners', 'Local Government Officials', 'Village Leaders',
  'School Administrators', 'Nurses', 'Midwives', 'Social Workers',
  'Police Officers', 'Civil Servants', 'NGO Staff', 'Cooperative Members',
  'Fisher Folk', 'Factory Workers', 'Tourism Workers', 'Construction Workers'
]

// Activity title templates
const ACTIVITY_TITLES = [
  'Strengthening {sector} Systems in {location}',
  'Improving {outcome} through {approach} in {location}',
  '{sector} Development Program for {target}',
  'Building Resilience in {sector} Sector',
  'Capacity Building for {target} in {location}',
  'Emergency Response and {outcome} Program',
  'Integrated {sector} and {sector2} Initiative',
  'Community-Based {outcome} Project in {location}',
  'Sustainable {sector} Development in {location}',
  'Enhancing {outcome} for {target}'
]

const SECTORS_SIMPLE = ['Health', 'Education', 'Water and Sanitation', 'Agriculture', 'Governance', 'Social Protection', 'Economic Development']
const OUTCOMES = ['Access', 'Quality', 'Equity', 'Sustainability', 'Resilience', 'Participation', 'Accountability']
const APPROACHES = ['Community Mobilization', 'Capacity Building', 'Infrastructure Development', 'Policy Reform', 'Service Delivery', 'Technology Transfer']

interface GeneratedActivity {
  // Core fields
  iati_id: string
  title: string
  description: string
  objectives: string
  target_groups: string[]
  recipient_country: string
  
  // IATI codes
  default_aid_type: string
  default_flow_type: string
  default_finance_type: string
  activity_status: string
  
  // Dates
  start_date: string
  end_date: string
  
  // Organizations
  reporting_org_id: string
  implementing_org_ids: string[]
  
  // Sectors
  sectors: Array<{
    code: string
    name: string
    percentage: number
  }>
  
  // Location
  locations: string[]
  
  // Generated transactions
  transactions?: GeneratedTransaction[]
}

interface GeneratedTransaction {
  transaction_type: '2' | '3' | '4' | '7' // IATI codes: 2=Commitment, 3=Disbursement, 4=Expenditure, 7=Reimbursement
  transaction_date: string
  value: number
  currency: string
  provider_org_id: string
  receiver_org_id: string
  description: string
  
  // Optional IATI fields
  aid_type?: string
  finance_type?: string
  flow_type?: string
}

async function fetchExistingOrganizations() {
  console.log('📋 Fetching existing organizations...')
  
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('id, name, organisation_type, iati_org_id')
  
  if (error || !organizations) {
    console.error('Error fetching organizations:', error)
    return []
  }
  
  console.log(`✅ Found ${organizations.length} existing organizations`)
  return organizations
}

function generateActivityTitle(): string {
  const template = faker.helpers.arrayElement(ACTIVITY_TITLES)
  return template
    .replace('{sector}', faker.helpers.arrayElement(SECTORS_SIMPLE))
    .replace('{sector2}', faker.helpers.arrayElement(SECTORS_SIMPLE))
    .replace('{location}', faker.helpers.arrayElement(MYANMAR_LOCATIONS))
    .replace('{target}', faker.helpers.arrayElement(TARGET_GROUPS))
    .replace('{outcome}', faker.helpers.arrayElement(OUTCOMES))
    .replace('{approach}', faker.helpers.arrayElement(APPROACHES))
}

function generateActivityDescription(title: string, sectors: any[], targetGroups: string[]): string {
  const intro = `This ${faker.helpers.arrayElement(['project', 'program', 'initiative'])} aims to ${title.toLowerCase()}.`
  
  const approach = `The intervention uses a ${faker.helpers.arrayElement(['participatory', 'community-based', 'rights-based', 'inclusive', 'integrated'])} approach, 
    working directly with ${targetGroups.join(' and ')} to achieve sustainable development outcomes.`
  
  const scope = `Key activities include ${faker.helpers.arrayElement([
    'capacity building workshops',
    'infrastructure development',
    'policy advocacy',
    'service delivery improvements',
    'community mobilization',
    'technical assistance'
  ])}, ${faker.helpers.arrayElement([
    'training programs',
    'resource distribution',
    'system strengthening',
    'institutional development',
    'awareness campaigns'
  ])}, and ${faker.helpers.arrayElement([
    'monitoring and evaluation',
    'knowledge management',
    'coordination mechanisms',
    'partnership development'
  ])}.`
  
  const impact = `Expected outcomes include improved ${faker.helpers.arrayElement([
    'service delivery',
    'living conditions',
    'economic opportunities',
    'health outcomes',
    'education quality',
    'governance systems'
  ])} for approximately ${faker.number.int({ min: 1000, max: 50000 })} beneficiaries across ${faker.number.int({ min: 5, max: 50 })} communities.`
  
  return `${intro} ${approach} ${scope} ${impact}`
}

function generateObjectives(sectors: any[]): string {
  const objectives = [
    `1. To improve ${sectors[0].name.toLowerCase()} services and infrastructure`,
    `2. To strengthen capacity of local ${faker.helpers.arrayElement(['institutions', 'organizations', 'government units', 'service providers'])}`,
    `3. To enhance ${faker.helpers.arrayElement(['community participation', 'accountability mechanisms', 'resource management', 'coordination systems'])}`,
    `4. To promote ${faker.helpers.arrayElement(['sustainability', 'inclusiveness', 'gender equality', 'environmental protection'])}`
  ]
  
  return objectives.join('\n')
}

function selectSectors(): Array<{ code: string; name: string; percentage: number }> {
  const count = faker.number.int({ min: 1, max: 3 })
  const selected = faker.helpers.arrayElements(SECTOR_CODES, count)
  
  if (count === 1) {
    return [{ ...selected[0], percentage: 100 }]
  }
  
  const percentages: number[] = []
  let remaining = 100
  
  for (let i = 0; i < count - 1; i++) {
    const pct = faker.number.int({ min: 20, max: Math.min(60, remaining - (count - i - 1) * 10) })
    percentages.push(pct)
    remaining -= pct
  }
  percentages.push(remaining)
  
  return selected.map((sector, i) => ({
    ...sector,
    percentage: percentages[i]
  }))
}

function generateTransactions(
  activityStartDate: Date,
  activityEndDate: Date,
  organizations: any[]
): GeneratedTransaction[] {
  const transactions: GeneratedTransaction[] = []
  const transactionCount = faker.number.int({ min: 15, max: 20 })
  
  // Ensure we have good provider/receiver organizations
  const donors = organizations.filter(o => ['10', '40', '22'].includes(o.organisation_type))
  const implementers = organizations.filter(o => ['21', '23', '24', '80'].includes(o.organisation_type))
  
  if (donors.length === 0 || implementers.length === 0) {
    console.warn('Not enough organizations of appropriate types for transactions')
    return transactions
  }
  
  // Generate a mix of transaction types (using IATI codes)
  const typeDistribution = {
    '2': Math.floor(transactionCount * 0.2), // 20% commitments (IATI code 2)
    '3': Math.floor(transactionCount * 0.5), // 50% disbursements (IATI code 3)
    '4': Math.floor(transactionCount * 0.2), // 20% expenditures (IATI code 4)
    '7': Math.floor(transactionCount * 0.1)  // 10% reimbursements (IATI code 7)
  }
  
  // Ensure we have exactly the right count
  const totalPlanned = Object.values(typeDistribution).reduce((a, b) => a + b, 0)
  if (totalPlanned < transactionCount) {
    typeDistribution['3'] += transactionCount - totalPlanned
  }
  
  // Generate transactions by type
  Object.entries(typeDistribution).forEach(([type, count]) => {
    for (let i = 0; i < count; i++) {
      const transactionDate = faker.date.between({ from: activityStartDate, to: activityEndDate })
      
      const transaction: GeneratedTransaction = {
        transaction_type: type as '2' | '3' | '4' | '7',
        transaction_date: transactionDate.toISOString().split('T')[0],
        value: faker.number.float({ min: 10000, max: 500000, fractionDigits: 2 }),
        currency: 'USD',
        provider_org_id: faker.helpers.arrayElement(donors).id,
        receiver_org_id: faker.helpers.arrayElement(implementers).id,
        description: generateTransactionDescription(type),
        
        // Add optional IATI fields
        aid_type: faker.helpers.arrayElement(AID_TYPES).code,
        finance_type: faker.helpers.arrayElement(FINANCE_TYPES).code,
        flow_type: faker.helpers.arrayElement(FLOW_TYPES).code
      }
      
      transactions.push(transaction)
    }
  })
  
  // Sort by date
  return transactions.sort((a, b) => 
    new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  )
}

function generateTransactionDescription(type: string): string {
  const descriptions: Record<string, string[]> = {
    '2': [ // Commitment
      'Multi-year funding commitment',
      'Annual budget allocation',
      'Project funding commitment',
      'Co-financing commitment',
      'Partnership contribution commitment'
    ],
    '3': [ // Disbursement
      'Quarterly disbursement',
      'Monthly operational funding',
      'Implementation phase disbursement',
      'Activity-based disbursement',
      'Performance-based disbursement',
      'Emergency response disbursement'
    ],
    '4': [ // Expenditure
      'Program implementation costs',
      'Staff salaries and benefits',
      'Training and capacity building expenses',
      'Equipment and supplies',
      'Infrastructure development costs',
      'Monitoring and evaluation expenses'
    ],
    '7': [ // Reimbursement
      'Cost recovery payment',
      'Shared cost reimbursement',
      'Advance settlement',
      'Joint activity cost sharing'
    ]
  }
  
  return faker.helpers.arrayElement(descriptions[type])
}

async function generateActivity(index: number, organizations: any[]): Promise<GeneratedActivity> {
  // Select organizations
  const reportingOrg = faker.helpers.arrayElement(organizations)
  const implementingOrgs = faker.helpers.arrayElements(organizations, faker.number.int({ min: 1, max: 3 }))
  
  // Generate dates
  const startDate = faker.date.between({ from: '2023-01-01', to: '2024-06-30' })
  const endDate = faker.date.between({ from: '2025-01-01', to: '2027-12-31' })
  
  // Select sectors
  const sectors = selectSectors()
  
  // Select target groups
  const targetGroups = faker.helpers.arrayElements(TARGET_GROUPS, faker.number.int({ min: 2, max: 3 }))
  
  // Generate title
  const title = generateActivityTitle()
  
  const activity: GeneratedActivity = {
    iati_id: `${reportingOrg.iati_org_id || reportingOrg.id}-${String(index + 1).padStart(3, '0')}`,
    title,
    description: generateActivityDescription(title, sectors, targetGroups),
    objectives: generateObjectives(sectors),
    target_groups: targetGroups,
    recipient_country: 'MM',
    
    // IATI codes
    default_aid_type: faker.helpers.arrayElement(AID_TYPES).code,
    default_flow_type: faker.helpers.arrayElement(FLOW_TYPES).code,
    default_finance_type: faker.helpers.arrayElement(FINANCE_TYPES).code,
    activity_status: faker.helpers.weightedArrayElement([
      { value: '2', weight: 60 }, // Most are in implementation
      { value: '1', weight: 20 }, // Some in pipeline
      { value: '3', weight: 10 }, // Some finalizing
      { value: '4', weight: 10 }  // Some closed
    ]),
    
    // Dates
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    
    // Organizations
    reporting_org_id: reportingOrg.id,
    implementing_org_ids: implementingOrgs.map(o => o.id),
    
    // Sectors
    sectors,
    
    // Locations
    locations: faker.helpers.arrayElements(MYANMAR_LOCATIONS, faker.number.int({ min: 1, max: 3 }))
  }
  
  // Generate transactions
  activity.transactions = generateTransactions(startDate, endDate, organizations)
  
  return activity
}

async function main() {
  console.log('🚀 Starting Myanmar AIMS IATI-compliant data generation...')
  console.log('=' .repeat(60))
  
  try {
    // Step 1: Fetch existing organizations
    const organizations = await fetchExistingOrganizations()
    
    if (organizations.length < 5) {
      console.error('❌ Not enough organizations found. Please ensure you have at least 5 organizations in the database.')
      process.exit(1)
    }
    
    // Step 2: Generate 20 activities
    console.log('\n📊 Generating 20 Myanmar aid activities with transactions...\n')
    
    const activities: GeneratedActivity[] = []
    
    for (let i = 0; i < 20; i++) {
      const activity = await generateActivity(i, organizations)
      activities.push(activity)
      
      console.log(`✅ Generated activity ${i + 1}/20: ${activity.title}`)
      console.log(`   - Status: ${ACTIVITY_STATUSES.find(s => s.code === activity.activity_status)?.name}`)
      console.log(`   - Sectors: ${activity.sectors.map(s => `${s.name} (${s.percentage}%)`).join(', ')}`)
      console.log(`   - Transactions: ${activity.transactions?.length || 0}`)
      console.log(`   - Total value: $${activity.transactions?.reduce((sum, t) => sum + t.value, 0).toLocaleString() || 0}`)
    }
    
    // Step 3: Save to JSON files
    const timestamp = new Date().toISOString().split('T')[0]
    
    // Save activities
    const activitiesFile = resolve(__dirname, `../../myanmar-activities-${timestamp}.json`)
    writeFileSync(activitiesFile, JSON.stringify(activities, null, 2))
    
    // Save transactions separately for easier import
    const allTransactions = activities.flatMap((activity, activityIndex) => 
      (activity.transactions || []).map(transaction => ({
        ...transaction,
        activity_iati_id: activity.iati_id,
        activity_index: activityIndex
      }))
    )
    
    const transactionsFile = resolve(__dirname, `../../myanmar-transactions-${timestamp}.json`)
    writeFileSync(transactionsFile, JSON.stringify(allTransactions, null, 2))
    
    // Generate summary
    console.log('\n' + '=' .repeat(60))
    console.log('🎉 Data generation complete!')
    console.log('\n📈 Summary:')
    console.log(`- Activities generated: ${activities.length}`)
    console.log(`- Total transactions: ${allTransactions.length}`)
    console.log(`- Total value: $${allTransactions.reduce((sum, t) => sum + t.value, 0).toLocaleString()}`)
    console.log(`- Date range: ${activities.map(a => a.start_date).sort()[0]} to ${activities.map(a => a.end_date).sort().reverse()[0]}`)
    
    console.log('\n📁 Output files:')
    console.log(`- Activities: ${activitiesFile}`)
    console.log(`- Transactions: ${transactionsFile}`)
    
    console.log('\n💡 Next steps:')
    console.log('1. Review the generated JSON files')
    console.log('2. Use your existing import tools or database scripts to load the data')
    console.log('3. Or manually insert using your admin interface')
    
  } catch (error) {
    console.error('❌ Error during data generation:', error)
    process.exit(1)
  }
}

// Run the script
main() 