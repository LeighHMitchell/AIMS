import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// IATI-compliant organization types
const IATI_ORGANIZATION_TYPES = [
  { code: '10', label: 'Government', description: 'Central government bodies or ministries', is_active: true, sort_order: 1 },
  { code: '11', label: 'Local Government', description: 'Any local (sub national) government organisation in either donor or recipient country', is_active: true, sort_order: 2 },
  { code: '15', label: 'Other Public Sector', description: 'Semi-autonomous public bodies, utilities, parastatals', is_active: true, sort_order: 3 },
  { code: '21', label: 'International NGO', description: 'NGOs operating internationally, headquartered in another country', is_active: true, sort_order: 4 },
  { code: '22', label: 'National NGO', description: 'NGOs headquartered and operating within the same country', is_active: true, sort_order: 5 },
  { code: '23', label: 'Regional NGO', description: 'NGOs operating across multiple countries in a region', is_active: true, sort_order: 6 },
  { code: '24', label: 'Partner Country based NGO', description: 'Local and National NGO / CSO based in aid/assistance recipient country', is_active: true, sort_order: 7 },
  { code: '30', label: 'Public Private Partnership', description: 'Joint public–private organisational structure', is_active: true, sort_order: 8 },
  { code: '40', label: 'Multilateral', description: 'Intergovernmental organisations with global/regional mandates (e.g. UN, MDBs)', is_active: true, sort_order: 9 },
  { code: '60', label: 'Foundation', description: 'Charitable and philanthropic grant-making bodies', is_active: true, sort_order: 10 },
  { code: '70', label: 'Private Sector', description: 'Unspecified private sector actor', is_active: true, sort_order: 11 },
  { code: '71', label: 'Private Sector in Provider Country', description: 'Private sector company operating in the donor/provider country', is_active: true, sort_order: 12 },
  { code: '72', label: 'Private Sector in Aid Recipient Country', description: 'Private sector company operating in the aid recipient country', is_active: true, sort_order: 13 },
  { code: '73', label: 'Private Sector in Third Country', description: 'Private sector company not located in donor or recipient country', is_active: true, sort_order: 14 },
  { code: '80', label: 'Academic, Training and Research', description: 'Universities, think tanks, research institutions', is_active: true, sort_order: 15 },
  { code: '90', label: 'Other', description: 'Organisations that do not fit into any defined category', is_active: true, sort_order: 16 }
]

// Mapping rules from old to new types
const TYPE_MAPPING = [
  // Government types
  { old_type: 'government', new_code: '10', is_domestic: true },
  { old_type: 'government', new_code: '11', is_domestic: true },
  { old_type: 'government', new_code: '15', is_domestic: true },
  // NGO types
  { old_type: 'ngo', new_code: '22', is_domestic: true },
  { old_type: 'ngo', new_code: '21', is_domestic: false },
  { old_type: 'ingo', new_code: '21', is_domestic: false },
  // UN/Multilateral types
  { old_type: 'un', new_code: '40', is_domestic: false },
  { old_type: 'multilateral', new_code: '40', is_domestic: false },
  // Private sector types
  { old_type: 'private', new_code: '70', is_domestic: false },
  // Academic types
  { old_type: 'academic', new_code: '80', is_domestic: false },
  // Other types
  { old_type: 'other', new_code: '90', is_domestic: false },
  { old_type: 'bilateral', new_code: '40', is_domestic: false }
]

export async function POST(request: NextRequest) {
  try {
    console.log('[Migration] Starting organization types migration...')

    // Step 1: Get all existing organizations
    const { data: organizations, error: orgError } = await getSupabaseAdmin()
      .from('organizations')
      .select('id, organisation_type, country')

    if (orgError) throw orgError

    console.log(`[Migration] Found ${organizations?.length || 0} organizations to migrate`)

    // Step 2: Create the migration log table if it doesn't exist
    const { error: createTableError } = await getSupabaseAdmin().rpc('create_migration_log_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS organization_type_migration_log (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          organization_id UUID REFERENCES organizations(id),
          old_type TEXT,
          new_type TEXT,
          country TEXT,
          migration_date TIMESTAMPTZ DEFAULT NOW(),
          needs_review BOOLEAN DEFAULT true,
          review_notes TEXT
        );
      `
    }).single()

    // If RPC doesn't exist, that's okay - we'll skip logging
    if (createTableError && !createTableError.message.includes('function create_migration_log_table')) {
      console.log('[Migration] Could not create migration log table:', createTableError)
    }

    // Step 3: Map organizations to new types
    const updates = []
    const reviewNeeded = []

    for (const org of organizations || []) {
      const is_domestic = org.country === 'Myanmar'
      
      // Find matching type mapping
      const mapping = TYPE_MAPPING.find(m => 
        m.old_type === org.organisation_type && 
        m.is_domestic === is_domestic
      )

      const new_type = mapping?.new_code || (is_domestic ? '22' : '21')
      
      updates.push({
        id: org.id,
        organisation_type: new_type
      })

      // Log organizations that need review (mapped to "Other")
      if (new_type === '90') {
        reviewNeeded.push({
          organization_id: org.id,
          old_type: org.organisation_type,
          new_type: new_type,
          country: org.country,
          needs_review: true
        })
      }
    }

    // Step 4: Update organizations in batches
    const batchSize = 100
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      
      for (const update of batch) {
        const { error: updateError } = await getSupabaseAdmin()
          .from('organizations')
          .update({ organisation_type: update.organisation_type })
          .eq('id', update.id)
        
        if (updateError) {
          console.error(`[Migration] Failed to update org ${update.id}:`, updateError)
        }
      }
    }

    // Step 5: Log organizations that need review
    if (reviewNeeded.length > 0) {
      const { error: logError } = await getSupabaseAdmin()
        .from('organization_type_migration_log')
        .insert(reviewNeeded)
      
      if (logError) {
        console.log('[Migration] Could not log review needed organizations:', logError)
      }
    }

    // Step 6: Update the organization_types table
    // First, delete existing types
    const { error: deleteError } = await getSupabaseAdmin()
      .from('organization_types')
      .delete()
      .neq('code', 'PLACEHOLDER') // Delete all except a non-existent placeholder

    if (deleteError) throw deleteError

    // Insert new IATI types
    const { error: insertError } = await getSupabaseAdmin()
      .from('organization_types')
      .insert(IATI_ORGANIZATION_TYPES)

    if (insertError) throw insertError

    // Step 7: Get final counts
    const { count: totalOrgs } = await getSupabaseAdmin()
      .from('organizations')
      .select('*', { count: 'exact', head: true })

    const { count: reviewCount } = await getSupabaseAdmin()
      .from('organization_type_migration_log')
      .select('*', { count: 'exact', head: true })
      .eq('needs_review', true)

    return NextResponse.json({
      success: true,
      message: 'Organization types migrated successfully',
      stats: {
        organizations_migrated: totalOrgs || 0,
        new_types_added: IATI_ORGANIZATION_TYPES.length,
        organizations_needing_review: reviewCount || 0
      }
    })

  } catch (error) {
    console.error('[Migration] Error:', error)
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
} 