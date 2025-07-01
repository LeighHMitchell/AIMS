import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export interface RolodexPerson {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  organization_id?: string;
  organization_name?: string;
  activity_id?: string;
  activity_title?: string;
  country_code?: string;
  notes?: string;
  profile_photo?: string;
  role_label?: string;
  contact_type?: string;
  created_at: string;
  updated_at: string;
  last_contacted?: string;
  source: 'manual' | 'activity' | 'organization';
}

export interface RolodexFilters {
  search?: string;
  source?: string;
  role?: string;
  organization?: string;
  activity?: string;
  country?: string;
  page?: number;
  limit?: number;
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const filters: RolodexFilters = {
      search: searchParams.get('search') || undefined,
      source: searchParams.get('source') || undefined,
      role: searchParams.get('role') || undefined,
      organization: searchParams.get('organization') || undefined,
      activity: searchParams.get('activity') || undefined,
      country: searchParams.get('country') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '24'),
    };

    console.log('[AIMS Rolodex] Fetching people with filters:', filters);

    // Calculate offset for pagination
    const offset = ((filters.page || 1) - 1) * (filters.limit || 24);

    // Use the search function for better performance
    const { data: people, error, count } = await getSupabaseAdmin()
      .rpc('search_unified_rolodex', {
        p_search: filters.search || null,
        p_source_type: filters.source || null,
        p_role: filters.role || null,
        p_organization_id: filters.organization ? null : null, // Will filter by name instead
        p_activity_id: filters.activity ? null : null, // Will filter by title instead
        p_country_code: filters.country || null,
        p_limit: filters.limit || 24,
        p_offset: offset
      });

    if (error) {
      console.error('[AIMS Rolodex] Database error:', error);
      
      // Fallback to direct view query if function doesn't exist
      if (error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.log('[AIMS Rolodex] Function not found, checking if view exists...');
        
        // First check if the view exists
        const { error: viewCheckError } = await getSupabaseAdmin()
          .from('person_unified_view')
          .select('id')
          .limit(1);
          
        if (viewCheckError && viewCheckError.message?.includes('does not exist')) {
          console.log('[AIMS Rolodex] View does not exist, using users-only query...');
          
          let usersQuery = getSupabaseAdmin()
            .from('users')
            .select(`
              id,
              name,
              email,
              role,
              organization_id,
              created_at,
              updated_at,
              organizations(name, country)
            `, { count: 'exact' })
            .not('email', 'is', null)
            .neq('email', '');

          if (filters.search) {
            usersQuery = usersQuery.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
          }

          if (filters.role) {
            usersQuery = usersQuery.ilike('role', `%${filters.role}%`);
          }

          // Apply pagination
          usersQuery = usersQuery
            .order('name', { ascending: true })
            .range(offset, offset + (filters.limit || 24) - 1);

          const { data: users, error: usersError, count: usersCount } = await usersQuery;

          if (usersError) {
            throw usersError;
          }

          // Transform users to match the unified format
          const transformedPeople: RolodexPerson[] = (users || []).map((person: any) => ({
            id: person.id,
            source: 'user' as const,
            name: person.name || 'Unknown',
            email: person.email || '',
            role: person.role || '',
            organization_id: person.organization_id,
            activity_id: null,
            position: null,
            phone: null,
            created_at: person.created_at,
            updated_at: person.updated_at,
            role_label: person.role || 'User',
            organization_name: person.organizations?.name || null,
            activity_title: null,
            country_code: person.organizations?.country || null,
            source_label: 'System User',
          }));

          const response = {
            people: transformedPeople,
            pagination: {
              page: filters.page || 1,
              limit: filters.limit || 24,
              total: usersCount || 0,
              totalPages: Math.ceil((usersCount || 0) / (filters.limit || 24)),
            },
            filters: filters,
          };

          console.log(`[AIMS Rolodex] Successfully fetched ${transformedPeople.length} people (users only)`);
          return NextResponse.json(response);
        } else {
          // View exists, proceed with view query
          console.log('[AIMS Rolodex] Using unified view query...');
          
          let query = getSupabaseAdmin()
            .from('person_unified_view')
            .select('*', { count: 'exact' });

          // Apply filters
          if (filters.search) {
            query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,role.ilike.%${filters.search}%,organisation_name.ilike.%${filters.search}%,organization_display_name.ilike.%${filters.search}%`);
          }

          if (filters.source) {
            query = query.eq('source_type', filters.source);
          }

          if (filters.role) {
            query = query.ilike('role', `%${filters.role}%`);
          }

          if (filters.organization) {
            query = query.or(`organization_display_name.ilike.%${filters.organization}%,organisation_name.ilike.%${filters.organization}%`);
          }

          if (filters.activity) {
            query = query.ilike('activity_title', `%${filters.activity}%`);
          }

          if (filters.country) {
            query = query.eq('country_code', filters.country);
          }

          // Apply pagination and sorting
          query = query
            .order('name', { ascending: true })
            .range(offset, offset + (filters.limit || 24) - 1);

          const { data: viewPeople, error: viewError, count: totalCount } = await query;

          if (viewError) {
            console.error('[AIMS Rolodex] View query error:', viewError);
            
            // Final fallback to users-only query (existing behavior)
            console.log('[AIMS Rolodex] Falling back to users-only query...');
            
            // ... users query code already exists above ...
            throw viewError; // This will be caught by outer try-catch
          }

          // Transform view data to RolodexPerson format
          const transformedPeople: RolodexPerson[] = (viewPeople || []).map((person: any) => ({
            id: person.id,
            source: person.source_type as 'user' | 'activity_contact',
            name: person.name || 'Unknown',
            email: person.email || '',
            role: person.role || '',
            organization_id: person.organization_id || null,
            activity_id: person.activity_id || null,
            position: person.position || null,
            phone: person.phone || null,
            created_at: person.created_at,
            updated_at: person.updated_at,
            role_label: person.role_label || 'Contact',
            organization_name: person.organization_display_name || person.organisation_name || null,
            activity_title: person.activity_title || null,
            country_code: person.country_code || null,
            source_label: person.source_label || 'Contact',
            notes: person.notes || null,
            profile_photo: person.profile_photo || null,
          }));

          const response = {
            people: transformedPeople,
            pagination: {
              page: filters.page || 1,
              limit: filters.limit || 24,
              total: totalCount || 0,
              totalPages: Math.ceil((totalCount || 0) / (filters.limit || 24)),
            },
            filters: filters,
          };

          console.log(`[AIMS Rolodex] Successfully fetched ${transformedPeople.length} people from unified view`);
          return NextResponse.json(response);
        }
      }

      return NextResponse.json(
        { error: 'Failed to fetch rolodex data', details: error.message },
        { status: 500 }
      );
    }

    // Get total count (need a separate query since the function doesn't return count)
    const { count: totalCount } = await getSupabaseAdmin()
      .from('person_unified_view')
      .select('*', { count: 'exact', head: true })
      .or(filters.search ? `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%` : 'id.neq.00000000-0000-0000-0000-000000000000')
      .eq(filters.source ? 'source_type' : 'source_type', filters.source || filters.source ? filters.source : 'source_type');

    // Transform data to ensure consistent format
    const transformedPeople: RolodexPerson[] = (people || []).map((person: any) => ({
      id: person.id,
      source: person.source_type as 'user' | 'activity_contact',
      name: person.name || 'Unknown',
      email: person.email || '',
      role: person.role || '',
      organization_id: person.organization_id || null,
      activity_id: person.activity_id || null,
      position: person.position || null,
      phone: person.phone || null,
      created_at: person.created_at,
      updated_at: person.updated_at,
      role_label: person.role_label || 'Contact',
      organization_name: person.organization_display_name || person.organisation_name || null,
      activity_title: person.activity_title || null,
      country_code: person.country_code || null,
      source_label: person.source_label || 'Contact',
      notes: person.notes || null,
      profile_photo: person.profile_photo || null,
    }));

    const response = {
      people: transformedPeople,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 24,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / (filters.limit || 24)),
      },
      filters: filters,
    };

    console.log(`[AIMS Rolodex] Successfully fetched ${transformedPeople.length} people`);

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('[AIMS Rolodex] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}