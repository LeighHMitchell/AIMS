import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { escapeIlikeWildcards } from '@/lib/security-utils';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    const search = searchParams.get('search') || undefined;
    const sector = searchParams.get('sector') || undefined;
    const region = searchParams.get('region') || undefined;
    const organization = searchParams.get('organization') || undefined;
    const expertise = searchParams.get('expertise') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');

    const offset = (page - 1) * limit;

    // Build query - only community contacts
    let query = supabase
      .from('contacts')
      .select(`
        id,
        title,
        first_name,
        middle_name,
        last_name,
        email,
        secondary_email,
        phone,
        position,
        job_title,
        department,
        organisation,
        organisation_id,
        profile_photo,
        notes,
        sector_focus,
        geographic_focus,
        expertise_areas,
        contact_frequency,
        ministry_affiliation,
        status,
        created_at,
        updated_at,
        organizations:organisation_id (
          id,
          name,
          acronym,
          type
        )
      `, { count: 'exact' })
      .eq('is_community_contact', true);

    // Apply filters
    if (search) {
      const escaped = escapeIlikeWildcards(search);
      query = query.or(`first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,email.ilike.%${escaped}%,position.ilike.%${escaped}%,organisation.ilike.%${escaped}%`);
    }

    if (sector) {
      query = query.contains('sector_focus', [sector]);
    }

    if (region) {
      query = query.contains('geographic_focus', [region]);
    }

    if (organization) {
      query = query.eq('organisation_id', organization);
    }

    if (expertise) {
      query = query.contains('expertise_areas', [expertise]);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Order and paginate
    query = query
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: contacts, error, count } = await query;

    if (error) {
      console.error('[Community Directory API] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform contacts
    const transformedContacts = (contacts || []).map((contact: any) => {
      const fullName = [contact.first_name, contact.middle_name, contact.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();

      return {
        id: contact.id,
        name: fullName || contact.email || 'Unknown Contact',
        title: contact.title,
        first_name: contact.first_name,
        middle_name: contact.middle_name,
        last_name: contact.last_name,
        email: contact.email,
        secondary_email: contact.secondary_email,
        phone: contact.phone,
        position: contact.position,
        job_title: contact.job_title,
        department: contact.department,
        organization_id: contact.organisation_id,
        organization_name: contact.organizations?.name || contact.organisation,
        organization_acronym: contact.organizations?.acronym,
        organization_type: contact.organizations?.type,
        profile_photo: contact.profile_photo,
        notes: contact.notes,
        sector_focus: contact.sector_focus || [],
        geographic_focus: contact.geographic_focus || [],
        expertise_areas: contact.expertise_areas || [],
        contact_frequency: contact.contact_frequency,
        ministry_affiliation: contact.ministry_affiliation,
        status: contact.status || 'active',
        created_at: contact.created_at,
        updated_at: contact.updated_at,
      };
    });

    const total = count || 0;

    return NextResponse.json({
      contacts: transformedContacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Community Directory API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community directory', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();

    if (!body.first_name && !body.last_name && !body.email) {
      return NextResponse.json(
        { error: 'At least a name or email is required' },
        { status: 400 }
      );
    }

    const insertData = {
      title: body.title || null,
      first_name: body.first_name || null,
      middle_name: body.middle_name || null,
      last_name: body.last_name || null,
      email: body.email || null,
      secondary_email: body.secondary_email || null,
      phone: body.phone || null,
      position: body.position || null,
      job_title: body.job_title || null,
      department: body.department || null,
      organisation: body.organisation || null,
      organisation_id: body.organisation_id || null,
      profile_photo: body.profile_photo || null,
      notes: body.notes || null,
      is_community_contact: true,
      sector_focus: body.sector_focus || [],
      geographic_focus: body.geographic_focus || [],
      expertise_areas: body.expertise_areas || [],
      contact_frequency: body.contact_frequency || null,
      ministry_affiliation: body.ministry_affiliation || null,
      status: body.status || 'active',
    };

    const { data: contact, error } = await supabase
      .from('contacts')
      .insert(insertData)
      .select(`
        *,
        organizations:organisation_id (
          id,
          name,
          acronym,
          type
        )
      `)
      .single();

    if (error) {
      console.error('[Community Directory API] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contact, message: 'Community contact created successfully' }, { status: 201 });
  } catch (error) {
    console.error('[Community Directory API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to create community contact', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
