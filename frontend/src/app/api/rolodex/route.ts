import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { escapeIlikeWildcards } from '@/lib/security-utils';

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
  org_type?: string;
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
  activity_count?: number;
  activity_ids?: string[];
}

export interface RolodexFilters {
  search?: string;
  source?: string;
  role?: string;
  organization?: string;
  activity?: string;
  orgType?: string;
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

    const filters: RolodexFilters = {
      search: searchParams.get('search') || undefined,
      source: searchParams.get('source') || undefined,
      role: searchParams.get('role') || undefined,
      organization: searchParams.get('organization') || undefined,
      activity: searchParams.get('activity') || undefined,
      orgType: searchParams.get('orgType') || undefined,
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

    const offset = ((filters.page || 1) - 1) * (filters.limit || 24);

    // ============================================================
    // Users query (unchanged)
    // ============================================================
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
          acronym,
          type
        )
      `)
      .not('email', 'is', null)
      .neq('email', '');

    if (filters.search) {
      const escapedSearch = escapeIlikeWildcards(filters.search);
      usersQuery = usersQuery.or(`email.ilike.%${escapedSearch}%,first_name.ilike.%${escapedSearch}%,last_name.ilike.%${escapedSearch}%`);
    }
    if (filters.role) {
      const escapedRole = escapeIlikeWildcards(filters.role);
      usersQuery = usersQuery.ilike('role', `%${escapedRole}%`);
    }
    if (filters.organization) {
      usersQuery = usersQuery.eq('organization_id', filters.organization);
    }
    if (filters.source && filters.source !== 'user') {
      usersQuery = usersQuery.eq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      console.error('[AIMS Rolodex] Users query error:', usersError);
    }

    // ============================================================
    // Contacts query (from normalized contacts table)
    // ============================================================
    let contactsQuery = supabase
      .from('contacts')
      .select(`
        id,
        title,
        first_name,
        middle_name,
        last_name,
        email,
        secondary_email,
        position,
        job_title,
        department,
        organisation,
        organisation_id,
        phone,
        fax,
        profile_photo,
        notes,
        website,
        mailing_address,
        created_at,
        updated_at,
        organizations:organisation_id (
          id,
          name,
          acronym,
          type
        )
      `);

    if (filters.search) {
      const escapedSearch = escapeIlikeWildcards(filters.search);
      contactsQuery = contactsQuery.or(`first_name.ilike.%${escapedSearch}%,last_name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%,position.ilike.%${escapedSearch}%,organisation.ilike.%${escapedSearch}%`);
    }
    if (filters.role) {
      const escapedRole = escapeIlikeWildcards(filters.role);
      contactsQuery = contactsQuery.or(`position.ilike.%${escapedRole}%,job_title.ilike.%${escapedRole}%`);
    }
    if (filters.organization) {
      contactsQuery = contactsQuery.eq('organisation_id', filters.organization);
    }
    if (filters.source && filters.source !== 'activity_contact') {
      contactsQuery = contactsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { data: contacts, error: contactsError } = await contactsQuery;

    if (contactsError) {
      console.error('[AIMS Rolodex] Contacts query error:', contactsError);
    }

    // ============================================================
    // Fetch activity counts per contact from junction table
    // ============================================================
    let activityCountMap = new Map<string, string[]>();
    if (contacts && contacts.length > 0) {
      const contactIds = contacts.map((c: any) => c.id);
      const { data: junctionRows } = await supabase
        .from('activity_contacts')
        .select('contact_id, activity_id')
        .in('contact_id', contactIds)
        .not('contact_id', 'is', null);

      if (junctionRows) {
        for (const row of junctionRows) {
          if (!row.contact_id || !row.activity_id) continue;
          const existing = activityCountMap.get(row.contact_id);
          if (existing) {
            if (!existing.includes(row.activity_id)) {
              existing.push(row.activity_id);
            }
          } else {
            activityCountMap.set(row.contact_id, [row.activity_id]);
          }
        }
      }
    }

    // ============================================================
    // If filtering by activity, restrict contacts to those linked
    // ============================================================
    let contactIdsForActivity: Set<string> | null = null;
    if (filters.activity) {
      const { data: activityJunctions } = await supabase
        .from('activity_contacts')
        .select('contact_id')
        .eq('activity_id', filters.activity)
        .not('contact_id', 'is', null);

      if (activityJunctions) {
        contactIdsForActivity = new Set(activityJunctions.map((r: any) => r.contact_id));
      }
    }

    // ============================================================
    // Transform and combine
    // ============================================================
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
          org_type: user.organizations?.type,
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

    // Transform contacts (already deduplicated at DB level)
    if (contacts) {
      contacts.forEach((contact: any) => {
        // If filtering by activity, skip contacts not linked to that activity
        if (contactIdsForActivity && !contactIdsForActivity.has(contact.id)) {
          return;
        }

        const fullName = [contact.first_name, contact.middle_name, contact.last_name]
          .filter(Boolean)
          .join(' ')
          .trim();

        const activityIds = activityCountMap.get(contact.id) || [];

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
          role: contact.position || contact.job_title || '',
          organization_id: contact.organisation_id,
          organization_name: contact.organizations?.name || contact.organisation,
          organization_acronym: contact.organizations?.acronym,
          org_type: contact.organizations?.type,
          activity_id: activityIds[0] || undefined,
          position: contact.position,
          job_title: contact.job_title,
          phone: contact.phone,
          fax: contact.fax,
          created_at: contact.created_at,
          updated_at: contact.updated_at,
          role_label: contact.position || contact.job_title || '',
          activity_title: undefined,
          country_code: undefined,
          source_label: 'Activity Contact',
          profile_photo: contact.profile_photo || null,
          notes: contact.notes,
          activity_count: activityIds.length,
          activity_ids: activityIds,
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

    // Additional client-side filters
    let filteredPeople = transformedPeople;

    if (filters.orgType) {
      filteredPeople = filteredPeople.filter(person => person.org_type === filters.orgType);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredPeople = filteredPeople.filter(person =>
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
      // Update the contacts table directly — edits propagate to all linked activities
      const contactUpdateData: Record<string, any> = {
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
        .from('contacts')
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

    // Delete from contacts table — junction rows (activity_contacts) will have
    // contact_id set to NULL via ON DELETE SET NULL
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[AIMS Rolodex] Delete error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Also clean up orphaned junction rows that had this contact_id
    // (they now have contact_id = NULL with no meaningful data)
    await supabase
      .from('activity_contacts')
      .delete()
      .is('contact_id', null)
      .or('first_name.is.null,first_name.eq.');

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
