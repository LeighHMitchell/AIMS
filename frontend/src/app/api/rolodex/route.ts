import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export interface RolodexPerson {
  id: string;
  user_id?: string;
  name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  title?: string;
  email?: string;
  secondary_email?: string;
  phone?: string;
  fax?: string;
  position?: string;
  job_title?: string;
  department?: string;
  organization_id?: string;
  organization_name?: string;
  organization_acronym?: string;
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
  source: 'user' | 'activity_contact' | 'organization';
  role?: string;
  source_label?: string;
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
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse filters from query parameters - handle empty strings as undefined
    const filters: RolodexFilters = {
      search: searchParams.get('search') || undefined,
      source: searchParams.get('source') || undefined,
      role: searchParams.get('role') || undefined,
      organization: searchParams.get('organization') || undefined,
      activity: searchParams.get('activity') || undefined,
      country: searchParams.get('country') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '24'),
      sortBy: searchParams.get('sortBy') || 'name',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
    };

    // Clean up empty string values to undefined
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof RolodexFilters] === '') {
        filters[key as keyof RolodexFilters] = undefined as any;
      }
    });

    console.log('[AIMS Rolodex] Fetching people with filters:', filters);
    console.log('[AIMS Rolodex] Query URL:', request.url);
    console.log('[AIMS Rolodex] Source filter value:', filters.source, 'Type:', typeof filters.source);

    // Calculate offset for pagination
    const offset = ((filters.page || 1) - 1) * (filters.limit || 24);

    // Start with a direct approach - get users and activity contacts separately
    console.log('[AIMS Rolodex] Using direct table queries...');
    
    // Get users data with organization information
    let usersQuery = supabase
            .from('users')
            .select(`
              id,
              first_name,
              last_name,
              email,
              role,
              organization_id,
              avatar_url,
              job_title,
              department,
              telephone,
              created_at,
              updated_at,
              organizations!users_organization_id_fkey (
                id,
                name,
                acronym
              )
      `)
      .not('email', 'is', null)
      .neq('email', '');

    console.log('[AIMS Rolodex] Users query with organization join:', usersQuery);
    
    // Apply user filters
    if (filters.search) {
      usersQuery = usersQuery.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
    }
    if (filters.role) {
      usersQuery = usersQuery.ilike('role', `%${filters.role}%`);
    }
    if (filters.organization) {
      usersQuery = usersQuery.eq('organization_id', filters.organization);
    }
    // Only exclude users if specifically filtering for a different source
    if (filters.source && filters.source !== 'user') {
      // If filtering for non-user sources, return empty users
      usersQuery = usersQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // No matches
    }

    const { data: users, error: usersError } = await usersQuery;

    console.log('[AIMS Rolodex] Users query result:', { users: users?.length, error: usersError });
    console.log('[AIMS Rolodex] Sample user data:', users?.[0]);
    if (usersError) {
      console.log('[AIMS Rolodex] Users error details:', usersError);
    }
    
    // Let's also test a simple count query to see total users
    const { count: totalUsersCount, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    // Test with the same conditions as stats API
    const { count: filteredUsersCount, error: filteredCountError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('email', 'is', null)
      .neq('email', '');
    
    console.log('[AIMS Rolodex] Total users in database:', totalUsersCount, 'Error:', countError);
    console.log('[AIMS Rolodex] Filtered users (same as stats):', filteredUsersCount, 'Error:', filteredCountError);
    console.log('[AIMS Rolodex] Actual users returned by query:', users?.length);

    if (usersError) {
      console.error('[AIMS Rolodex] Users query error:', usersError);
      // Don't fail completely, just proceed without users data
    }

    // Get activity contacts data with organization details
    let contactsQuery = supabase
      .from('activity_contacts')
      .select(`
        id,
        title,
        first_name,
        middle_name,
        last_name,
        email,
        secondary_email,
        position,
        type,
        organisation,
        organisation_id,
        phone,
        fax,
        profile_photo,
        activity_id,
        notes,
        created_at,
        updated_at,
        organizations (
          id,
          name,
          acronym
        )
      `)
;

    console.log('[AIMS Rolodex] Contacts query with organization join:', contactsQuery);
    
    // Apply contact filters
    if (filters.search) {
      contactsQuery = contactsQuery.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,position.ilike.%${filters.search}%`);
    }
    if (filters.role) {
      contactsQuery = contactsQuery.or(`position.ilike.%${filters.role}%,type.ilike.%${filters.role}%`);
    }
    if (filters.organization) {
      contactsQuery = contactsQuery.eq('organisation_id', filters.organization);
    }
    if (filters.source && filters.source !== 'activity_contact') {
      // If filtering for non-contact sources, return empty contacts
      contactsQuery = contactsQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // No matches
    }

    const { data: contacts, error: contactsError } = await contactsQuery;

    console.log('[AIMS Rolodex] Contacts query result:', { contacts: contacts?.length, error: contactsError });
    
    // Let's also test a simple count query for activity contacts
    const { count: totalContactsCount, error: contactsCountError } = await supabase
      .from('activity_contacts')
      .select('*', { count: 'exact', head: true });
    
    console.log('[AIMS Rolodex] Total activity contacts in database:', totalContactsCount, 'Error:', contactsCountError);

    if (contactsError) {
      console.error('[AIMS Rolodex] Contacts query error:', contactsError);
      // Don't fail completely, just proceed without contacts data
    }

    // Transform and combine the data
    const transformedPeople: RolodexPerson[] = [];

    // Transform users
    if (users) {
      users.forEach((user: any) => {
        transformedPeople.push({
          id: user.id,
          source: 'user' as const,
          name: (user.first_name && user.last_name ? 
                 `${user.first_name} ${user.last_name}`.trim() : 
                 user.first_name || user.last_name || user.email || 'Unknown'),
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email || '',
          role: user.role || '',
          job_title: user.job_title,
          department: user.department,
          organization_id: user.organization_id,
          organization_name: user.organizations?.name,
          organization_acronym: user.organizations?.acronym,
          activity_id: undefined,
          position: user.job_title,
          phone: user.telephone,
          created_at: user.created_at,
          updated_at: user.updated_at,
          role_label: user.role || 'User',
          activity_title: undefined,
          country_code: undefined,
          source_label: 'System User',
          profile_photo: user.avatar_url || null,
        });
      });
    }

    // Transform activity contacts
    if (contacts) {
      contacts.forEach((contact: any) => {
        const fullName = [contact.first_name, contact.middle_name, contact.last_name]
          .filter(Boolean)
          .join(' ')
          .trim();
        
        transformedPeople.push({
          id: contact.id,
          source: 'activity_contact' as const,
          name: fullName || contact.email || 'Unknown Contact',
          title: contact.title,
          first_name: contact.first_name,
          middle_name: contact.middle_name,
          last_name: contact.last_name,
          email: contact.email || '',
          secondary_email: contact.secondary_email,
          role: contact.position || contact.type || '',
          organization_id: contact.organisation_id,
          organization_name: contact.organizations?.name || contact.organisation, // Use joined data first, fallback to text field
          organization_acronym: contact.organizations?.acronym,
          activity_id: contact.activity_id,
          position: contact.position,
          phone: contact.phone,
          fax: contact.fax,
          created_at: contact.created_at,
          updated_at: contact.updated_at,
          role_label: contact.type || contact.position || '',
          activity_title: undefined, // Will fetch separately if needed
          country_code: undefined, // Will fetch separately if needed
          source_label: 'Activity Contact',
          profile_photo: contact.profile_photo || null,
          notes: contact.notes,
        });
      });
    }

    // Apply sorting
    transformedPeople.sort((a, b) => {
      const { sortBy = 'name', sortOrder = 'asc' } = filters;
      let comparison = 0;

      switch (sortBy) {
        case 'firstName':
          comparison = (a.first_name || '').localeCompare(b.first_name || '');
          break;
        case 'lastName':
          comparison = (a.last_name || '').localeCompare(b.last_name || '');
          break;
        case 'email':
          comparison = (a.email || '').localeCompare(b.email || '');
          break;
        case 'organization':
          comparison = (a.organization_name || '').localeCompare(b.organization_name || '');
          break;
        case 'role':
          comparison = (a.role_label || '').localeCompare(b.role_label || '');
          break;
        case 'source':
          comparison = a.source.localeCompare(b.source);
          break;
        case 'name':
        default:
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Additional client-side filter for organization name (since it's from a joined table)
    // This ensures organization name search works even though it's not in the database query
    let filteredPeople = transformedPeople;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredPeople = transformedPeople.filter(person => 
        // Keep if any field matches (some already matched from DB query, but include org name here)
        (person.organization_name && person.organization_name.toLowerCase().includes(searchLower)) ||
        (person.organization_acronym && person.organization_acronym.toLowerCase().includes(searchLower)) ||
        (person.first_name && person.first_name.toLowerCase().includes(searchLower)) ||
        (person.last_name && person.last_name.toLowerCase().includes(searchLower)) ||
        (person.name && person.name.toLowerCase().includes(searchLower)) ||
        (person.email && person.email.toLowerCase().includes(searchLower))
      );
    }

    // Apply pagination
    const total = filteredPeople.length;
    console.log('[AIMS Rolodex] Total filtered people:', total);
    console.log('[AIMS Rolodex] First few people:', filteredPeople.slice(0, 3).map(p => ({ name: p.name, source: p.source })));
    
    const paginatedPeople = filteredPeople.slice(offset, offset + (filters.limit || 24));

    const response = {
      people: paginatedPeople,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 24,
        total,
        totalPages: Math.ceil(total / (filters.limit || 24)),
      },
      filters: filters,
    };

    console.log(`[AIMS Rolodex] Successfully fetched ${paginatedPeople.length} people (${users?.length || 0} users, ${contacts?.length || 0} contacts)`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[AIMS Rolodex] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch rolodex data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, source, ...updateData } = body;

    if (!id || !source) {
      return NextResponse.json(
        { error: 'ID and source are required' },
        { status: 400 }
      );
    }

    console.log('[AIMS Rolodex] Updating contact:', { id, source, updateData });

    let result;
    let error;

    if (source === 'user') {
      // Update user table
      const userUpdateData = {
        first_name: updateData.first_name,
        last_name: updateData.last_name,
        email: updateData.email,
        job_title: updateData.position || updateData.job_title,
        department: updateData.department,
        telephone: updateData.phone || updateData.telephone,
        avatar_url: updateData.profile_photo || updateData.avatar_url,
        updated_at: new Date().toISOString()
      };

      const { data, error: updateError } = await supabase
        .from('users')
        .update(userUpdateData)
        .eq('id', id)
        .select()
        .single();

      result = data;
      error = updateError;
    } else if (source === 'activity_contact') {
      // Update activity_contacts table
      const contactUpdateData = {
        first_name: updateData.first_name || updateData.name?.split(' ')[0],
        last_name: updateData.last_name || updateData.name?.split(' ').slice(1).join(' '),
        email: updateData.email,
        position: updateData.position,
        phone: updateData.phone,
        organisation: updateData.organization_name,
        department: updateData.department,
        notes: updateData.notes,
        profile_photo: updateData.profile_photo,
        updated_at: new Date().toISOString()
      };

      const { data, error: updateError } = await supabase
        .from('activity_contacts')
        .update(contactUpdateData)
        .eq('id', id)
        .select()
        .single();

      result = data;
      error = updateError;
    } else {
      return NextResponse.json(
        { error: 'Invalid source type' },
        { status: 400 }
      );
    }

    if (error) {
      console.error('[AIMS Rolodex] Update error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log('[AIMS Rolodex] Contact updated successfully:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[AIMS Rolodex] Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const source = searchParams.get('source');

    if (!id || !source) {
      return NextResponse.json(
        { error: 'ID and source are required' },
        { status: 400 }
      );
    }

    console.log('[AIMS Rolodex] Deleting contact:', { id, source });

    // Only allow deletion of activity contacts, not users
    if (source !== 'activity_contact') {
      return NextResponse.json(
        { error: 'Only activity contacts can be deleted from the Rolodex. Users must be managed through the admin panel.' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('activity_contacts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[AIMS Rolodex] Delete error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log('[AIMS Rolodex] Contact deleted successfully:', id);
    return NextResponse.json({ success: true, message: 'Contact deleted successfully' });

  } catch (error) {
    console.error('[AIMS Rolodex] Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
