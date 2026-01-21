import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

// Organization Type interface
interface OrganizationType {
  code: string
  label: string
  description: string
  is_active: boolean
  sort_order: number
}

// IATI-compliant organization types (2025 Edition)
const IATI_ORGANIZATION_TYPES: OrganizationType[] = [
  { code: '10', label: 'Government', description: 'Central government bodies or ministries', is_active: true, sort_order: 1 },
  { code: '11', label: 'Local Government', description: 'Any local (sub national) government organisation in either donor or recipient country', is_active: true, sort_order: 2 },
  { code: '15', label: 'Other Public Sector', description: 'Semi-autonomous public bodies, utilities, parastatals', is_active: true, sort_order: 3 },
  { code: '21', label: 'International NGO', description: 'NGOs operating internationally, headquartered in another country', is_active: true, sort_order: 4 },
  { code: '22', label: 'National NGO', description: 'NGOs headquartered and operating within the same country', is_active: true, sort_order: 5 },
  { code: '23', label: 'Regional NGO', description: 'NGOs operating across multiple countries in a region', is_active: true, sort_order: 6 },
  { code: '24', label: 'Partner Country based NGO', description: 'Local or national NGOs based in the aid recipient country', is_active: true, sort_order: 7 },
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

export async function GET(request: NextRequest) {
  console.log('[AIMS] GET /api/organization-types - Starting request');

  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json(IATI_ORGANIZATION_TYPES, { status: 200 });
  }

  try {
    // Try to fetch from the organization_types table
    const { data: organizationTypes, error } = await supabase
      .from('organization_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) {
      console.error('[AIMS] Error fetching organization types from database:', error);
      console.log('[AIMS] Returning default organization types');
      
      // Return default organization types
      return NextResponse.json(IATI_ORGANIZATION_TYPES, { status: 200 });
    }

    console.log('[AIMS] Successfully fetched organization types from database:', organizationTypes?.length || 0);
    
    // If we have data from database, use it; otherwise use defaults
    const responseData = organizationTypes && organizationTypes.length > 0 
      ? organizationTypes 
      : IATI_ORGANIZATION_TYPES;
    
    return NextResponse.json(responseData, { status: 200 });
    
  } catch (error) {
    console.error('[AIMS] Unexpected error in /api/organization-types:', error);
    
    // Return default organization types as fallback
    return NextResponse.json(IATI_ORGANIZATION_TYPES, { status: 200 });
  }
}

// Initialize/update organization types in the database
export async function POST(request: NextRequest) {
  console.log('[AIMS] POST /api/organization-types - Starting request to initialize data');

  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Insert or update organization types
    const { data, error } = await supabase
      .from('organization_types')
      .upsert(IATI_ORGANIZATION_TYPES, {
        onConflict: 'code',
        ignoreDuplicates: false
      })
      .select();
    
    if (error) {
      console.error('[AIMS] Error upserting organization types:', error);
      return NextResponse.json(
        { error: 'Failed to initialize organization types', details: error.message },
        { status: 500 }
      );
    }
    
    console.log('[AIMS] Successfully initialized organization types:', data?.length || 0);
    
    return NextResponse.json({
      message: 'Organization types initialized successfully',
      count: data?.length || 0,
      data: data
    }, { status: 200 });
    
  } catch (error) {
    console.error('[AIMS] Unexpected error in POST /api/organization-types:', error);
    return NextResponse.json(
      { error: 'Unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 