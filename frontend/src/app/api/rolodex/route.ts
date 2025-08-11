import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    // Start with a direct approach - get users and activity contacts separately
    console.log('[AIMS Rolodex] Using direct table queries...');
    
    // Get users data with organization details
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
              organizations!inner (
                name,
                acronym
              )
      `);

        // Apply user filters
          if (filters.search) {
      usersQuery = usersQuery.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
          }
          if (filters.role) {
            usersQuery = usersQuery.ilike('role', `%${filters.role}%`);
          }
    if (filters.source && filters.source !== 'user') {
      // If filtering for non-user sources, return empty users
      usersQuery = usersQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // No matches
          }

    const { data: users, error: usersError } = await usersQuery;

    console.log('[AIMS Rolodex] Users query result:', { users: users?.length, error: usersError });

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
          name,
          acronym
        )
      `);

    // Apply contact filters
          if (filters.search) {
      contactsQuery = contactsQuery.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,position.ilike.%${filters.search}%`);
    }
          if (filters.role) {
      contactsQuery = contactsQuery.or(`position.ilike.%${filters.role}%,type.ilike.%${filters.role}%`);
    }
    if (filters.source && filters.source !== 'activity_contact') {
      // If filtering for non-contact sources, return empty contacts
      contactsQuery = contactsQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // No matches
    }

    const { data: contacts, error: contactsError } = await contactsQuery;

    console.log('[AIMS Rolodex] Contacts query result:', { contacts: contacts?.length, error: contactsError });

    if (contactsError) {
      console.error('[AIMS Rolodex] Contacts query error:', contactsError);
      // Don't fail completely, just proceed without contacts data
    }

    // Transform and combine the data
    const transformedPeople: RolodexPerson[] = [];

    // Transform users
    if (users) {
      users.forEach((user: any) => {
        const orgData = user.organizations || {};
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
          organization_name: orgData.name || null,
          organization_acronym: orgData.acronym || null,
          activity_id: null,
          position: user.job_title,
          phone: user.telephone,
          created_at: user.created_at,
          updated_at: user.updated_at,
          role_label: user.role || 'User',
          activity_title: null,
          country_code: null,
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
        const orgData = contact.organizations || {};
        
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
          organization_name: orgData.name || contact.organisation || null,
          organization_acronym: orgData.acronym || null,
          activity_id: contact.activity_id,
          position: contact.position,
          phone: contact.phone,
          fax: contact.fax,
          created_at: contact.created_at,
          updated_at: contact.updated_at,
          role_label: contact.type || contact.position || 'Contact',
          activity_title: null, // Will fetch separately if needed
          country_code: null, // Will fetch separately if needed
          source_label: 'Activity Contact',
          profile_photo: contact.profile_photo || null,
          notes: contact.notes,
        });
      });
    }

    // Sort by source type and name
    transformedPeople.sort((a, b) => {
      if (a.source !== b.source) {
        return a.source === 'user' ? -1 : 1; // Users first
      }
      return a.name.localeCompare(b.name);
    });

    // Apply pagination
    const total = transformedPeople.length;
    const paginatedPeople = transformedPeople.slice(offset, offset + (filters.limit || 24));

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
  try {
    const supabase = getSupabaseAdmin();
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
