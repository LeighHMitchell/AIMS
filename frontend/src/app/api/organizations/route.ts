import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { escapeIlikeWildcards } from '@/lib/security-utils';

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
  
  const { response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    // Add caching headers to reduce repeated requests
    const headers = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5 minute cache
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    // Use admin client to bypass RLS — all authenticated users can view the org directory
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.error('[AIMS] Supabase admin client is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const iatiOrgId = searchParams.get('iati_org_id');
    const searchTerm = searchParams.get('search');

    // Build query with filters
    let query = supabaseAdmin
      .from('organizations')
      .select('id, name, acronym, type, Organisation_Type_Code, Organisation_Type_Name, country, logo, banner, description, website, email, phone, address, country_represented, cooperation_modality, iati_org_id, alias_refs, name_aliases, reporting_org_ref, reporting_org_type, reporting_org_name, reporting_org_secondary_reporter, last_updated_datetime, default_currency, default_language, social_twitter, social_facebook, social_linkedin, social_instagram, social_youtube, created_at, updated_at');
    
    // Filter by IATI org ID (exact match)
    if (iatiOrgId) {
      query = query.eq('iati_org_id', iatiOrgId);
    }
    
    // Filter by search term (fuzzy search on name and acronym)
    // SECURITY: Escape ILIKE wildcards to prevent filter injection
    if (searchTerm && searchTerm.trim() && !iatiOrgId) {
      const cleanSearchTerm = escapeIlikeWildcards(searchTerm.trim());
      query = query.or(`name.ilike.%${cleanSearchTerm}%,acronym.ilike.%${cleanSearchTerm}%`);
    }
    
    // Order results
    query = query.order('name');
    
    const { data: organizations, error } = await query;
    
    if (error) {
      console.error('[AIMS] Error fetching organizations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }
    
    // Return organizations without expensive activity counting for better performance
    return NextResponse.json(organizations || [], { headers });
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
  
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  
  try {
    if (!supabase) {
      console.error('[AIMS] Supabase client is not initialized');
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
    
    // Check if organization with same name, acronym, or IATI org ID already exists
    let existingQuery = supabase
      .from('organizations')
      .select('id, name, acronym, iati_org_id');

    // Build OR conditions dynamically
    const orConditions = [];
    if (organizationData.name) {
      orConditions.push(`name.ilike.${organizationData.name}`);
    }
    if (organizationData.acronym) {
      orConditions.push(`acronym.ilike.${organizationData.acronym}`);
    }
    if (organizationData.iati_org_id) {
      orConditions.push(`iati_org_id.eq.${organizationData.iati_org_id}`);
    }

    if (orConditions.length > 0) {
      existingQuery = existingQuery.or(orConditions.join(','));

      const { data: existing } = await existingQuery;

      if (existing && existing.length > 0) {
        // Check if it's an exact match
        const exactMatch = existing.find(org =>
          org.name?.toLowerCase().trim() === organizationData.name?.toLowerCase().trim() ||
          (organizationData.acronym && org.acronym?.toLowerCase().trim() === organizationData.acronym?.toLowerCase().trim()) ||
          (organizationData.iati_org_id && org.iati_org_id === organizationData.iati_org_id)
        );

        if (exactMatch) {
          console.log('[AIMS] Organization already exists, returning existing:', exactMatch);
          // Return the existing organization instead of error
          return NextResponse.json(exactMatch, { status: 200 });
        }
      }
    }
    
    const { data, error } = await supabase
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
  
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  
  try {
    if (!supabase) {
      console.error('[AIMS] Supabase client is not initialized');
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
    
    // Handle iati_org_id field - convert empty strings to null to avoid unique constraint issues
    if ('iati_org_id' in updates) {
      if (!updates.iati_org_id || updates.iati_org_id.trim() === '') {
        updates.iati_org_id = null;
      }
    }
    
    // Handle new IATI fields - ensure proper data types and defaults
    if ('reporting_org_secondary_reporter' in updates) {
      updates.reporting_org_secondary_reporter = updates.reporting_org_secondary_reporter || false;
    }
    
    if ('last_updated_datetime' in updates) {
      // Auto-update to current timestamp if not provided
      updates.last_updated_datetime = updates.last_updated_datetime || new Date().toISOString();
    }
    
    if ('default_currency' in updates) {
      updates.default_currency = updates.default_currency || 'USD';
    }
    
    if ('default_language' in updates) {
      updates.default_language = updates.default_language || 'en';
    }
    
    // Map frontend field names to database column names
    if ('country_represented' in updates) {
      // Save to both columns for compatibility
      updates.country = updates.country_represented;
      // Keep country_represented in updates so it also gets saved
    }
    
    if ('Organisation_Type_Code' in updates) {
      // Save to both type and Organisation_Type_Code columns for compatibility
      updates.type = updates.Organisation_Type_Code;
      updates.Organisation_Type_Code = updates.Organisation_Type_Code;
      
      // Auto-populate Organisation_Type_Name based on code
      const typeNameMap: Record<string, string> = {
        '10': 'Government',
        '11': 'Local Government',
        '15': 'Other Public Sector',
        '21': 'International NGO',
        '22': 'National NGO',
        '23': 'Regional NGO',
        '24': 'Partner Country based NGO',
        '30': 'Public Private Partnership',
        '40': 'Multilateral',
        '60': 'Foundation',
        '70': 'Private Sector',
        '71': 'Private Sector in Provider Country',
        '72': 'Private Sector in Aid Recipient Country',
        '73': 'Private Sector in Third Country',
        '80': 'Academic, Training and Research',
        '90': 'Other'
      };
      updates.Organisation_Type_Name = typeNameMap[updates.Organisation_Type_Code] || null;
    }
    
    // Handle logo field - check if logo_url column exists, otherwise map to logo
    if ('logo' in updates) {
      // Keep the logo field as is for now - we need to verify the correct column name
      // updates.logo_url = updates.logo;
      // delete updates.logo;
    }
    
    console.log('[AIMS] Updating organization with mapped data:', updates);
    console.log('[AIMS] default_currency being saved:', updates.default_currency);
    
    const { data, error } = await supabase
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
    console.log('[AIMS] Saved default_currency:', data.default_currency);
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
  
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  
  try {
    if (!supabase) {
      console.error('[AIMS] Supabase client is not initialized');
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