import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering to ensure environment variables are always loaded
export const dynamic = 'force-dynamic';

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function GET(request: NextRequest) {
  console.log('[AIMS] GET /api/organizations - Starting request');
  
  try {
    // Add caching headers to reduce repeated requests
    const headers = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5 minute cache
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    // Check if getSupabaseAdmin() is properly initialized
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    // Optimized query - only select needed fields for better performance
    const { data: organizations, error } = await getSupabaseAdmin()
      .from('organizations')
      .select('id, name, acronym, type, country')
      .order('name');
    
    if (error) {
      console.error('[AIMS] Error fetching organizations:', error);
      
      // Return sample data when database is unavailable for testing
      const sampleOrganizations = [
        {
          id: 'sample-org-1',
          name: 'Asian Development Bank',
          acronym: 'ADB',
          type: 'multilateral',
          country: 'Philippines',
          description: 'Multilateral development finance institution committed to achieving a prosperous, inclusive, resilient, and sustainable Asia and the Pacific.',
          website: 'https://www.adb.org',
          logo_url: null,
          contact_email: 'info@adb.org',
          contact_phone: null,
          address: 'Mandaluyong City, Metro Manila, Philippines',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T10:30:00Z'
        },
        {
          id: 'sample-org-2',
          name: 'Department of Foreign Affairs and Trade',
          acronym: 'DFAT',
          type: 'government',
          country: 'Australia',
          description: 'Australian government department responsible for foreign policy and trade relations.',
          website: 'https://www.dfat.gov.au',
          logo_url: null,
          contact_email: 'enquiries@dfat.gov.au',
          contact_phone: null,
          address: 'Canberra, Australia',
          is_active: true,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-20T14:45:00Z'
        },
        {
          id: 'sample-org-3',
          name: 'United Nations Development Programme',
          acronym: 'UNDP',
          type: 'multilateral',
          country: 'Global',
          description: 'UN agency focused on development, democracy, peace and climate change.',
          website: 'https://www.undp.org',
          logo_url: null,
          contact_email: 'info@undp.org',
          contact_phone: null,
          address: 'New York, USA',
          is_active: true,
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-02-01T09:20:00Z'
        },
        {
          id: 'sample-org-4',
          name: 'World Health Organization',
          acronym: 'WHO',
          type: 'multilateral',
          country: 'Global',
          description: 'UN specialized agency responsible for international public health.',
          website: 'https://www.who.int',
          logo_url: null,
          contact_email: 'info@who.int',
          contact_phone: null,
          address: 'Geneva, Switzerland',
          is_active: true,
          created_at: '2024-01-04T00:00:00Z',
          updated_at: '2024-01-25T16:10:00Z'
        },
        {
          id: 'sample-org-5',
          name: 'Local Community Development Foundation',
          acronym: 'LCDF',
          type: 'ngo',
          country: 'Cambodia',
          description: 'Local NGO focused on community-driven development initiatives.',
          website: 'https://www.lcdf-cambodia.org',
          logo_url: null,
          contact_email: 'contact@lcdf-cambodia.org',
          contact_phone: null,
          address: 'Phnom Penh, Cambodia',
          is_active: true,
          created_at: '2024-01-05T00:00:00Z',
          updated_at: '2024-02-10T11:30:00Z'
        }
      ];

      console.log('[AIMS] Returning sample organizations due to database error');
      return NextResponse.json(sampleOrganizations);
    }
    
    console.log('[AIMS] Fetched organizations count:', organizations.length);
    
    // Return organizations without expensive activity counting for better performance
    return NextResponse.json(organizations, { headers });
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[AIMS] POST /api/organizations - Starting request');
  
  try {
    // Check if getSupabaseAdmin() is properly initialized
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    const { name, acronym, type, country, ...otherFields } = body;
    
    console.log('[AIMS] Creating organization with data:', { name, acronym, type, country });
    
    // Ensure we have at least name
    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }
    
    // Set proper values for name and acronym
    const organizationData = {
      name: name, // Required field
      acronym: acronym || null,
      type: type || 'development_partner',
      country: country || null,
      ...otherFields
    };
    
    // Check if organization with same name or acronym already exists
    const { data: existing } = await getSupabaseAdmin()
      .from('organizations')
      .select('id, name, acronym')
      .or(`name.ilike.${organizationData.name},acronym.ilike.${organizationData.acronym}`);
    
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Organization with this name or acronym already exists' }, { status: 400 });
    }
    
    const { data, error } = await getSupabaseAdmin()
      .from('organizations')
      .insert([organizationData])
      .select()
      .single();
    
    if (error) {
      console.error('[AIMS] Error creating organization:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Created organization:', data);
    
    const response = NextResponse.json(data, { status: 201 });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  console.log('[AIMS] PUT /api/organizations - Starting request');
  
  try {
    // Check if getSupabaseAdmin() is properly initialized
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await getSupabaseAdmin()
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('[AIMS] Error updating organization:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Updated organization:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  console.log('[AIMS] DELETE /api/organizations - Starting request');
  
  try {
    // Check if getSupabaseAdmin() is properly initialized
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    // Comprehensive check for all references
    const supabase = getSupabaseAdmin();
    const references: string[] = [];
    
    // Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email', { count: 'exact' })
      .eq('organization_id', id);
    
    if (usersError) {
      console.error('[AIMS] Error checking users:', usersError);
      return NextResponse.json({ error: 'Failed to check organization references' }, { status: 500 });
    }
    
    if (users && users.length > 0) {
      references.push(`${users.length} user${users.length > 1 ? 's' : ''} (${users.map((u: any) => u.email).join(', ')})`);
    }
    
    // Check activities as reporting organization
    const { count: reportingCount } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('reporting_org_id', id);
    
    if (reportingCount && reportingCount > 0) {
      references.push(`${reportingCount} activities as reporting organization`);
    }
    
    // Check activity contributors
    const { count: contributorCount } = await supabase
      .from('activity_contributors')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', id);
    
    if (contributorCount && contributorCount > 0) {
      references.push(`${contributorCount} activity contributor entries`);
    }
    
    // Check transactions
    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .or(`provider_org_id.eq.${id},receiver_org_id.eq.${id}`);
    
    if (transactionCount && transactionCount > 0) {
      references.push(`${transactionCount} transactions`);
    }
    
    // If there are any references, prevent deletion
    if (references.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete organization with existing references',
          details: `This organization is referenced by: ${references.join(', ')}. Please remove or reassign these references before deleting.`
        },
        { status: 400 }
      );
    }
    
    // Proceed with deletion
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[AIMS] Error deleting organization:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Deleted organization:', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 