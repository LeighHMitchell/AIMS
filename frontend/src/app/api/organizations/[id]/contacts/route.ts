import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// GET - Fetch all contacts for an organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Fetch contacts with linked user data
    const { data: contacts, error } = await supabase
      .from('organization_contacts')
      .select(`
        *,
        linked_user:linked_user_id (
          id,
          email,
          first_name,
          middle_name,
          last_name,
          avatar_url
        )
      `)
      .eq('organization_id', organizationId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[OrgContacts API] Error fetching contacts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      );
    }

    // Transform database format to frontend format
    const transformedContacts = (contacts || []).map((contact: any) => ({
      id: contact.id,
      type: contact.type,
      title: contact.title,
      firstName: contact.first_name,
      middleName: contact.middle_name,
      lastName: contact.last_name,
      jobTitle: contact.job_title,
      department: contact.department,
      email: contact.email,
      phone: contact.phone,
      phoneNumber: contact.phone_number,
      countryCode: contact.country_code,
      website: contact.website,
      mailingAddress: contact.mailing_address,
      profilePhoto: contact.profile_photo,
      notes: contact.notes,
      isPrimary: contact.is_primary,
      displayOrder: contact.display_order,
      linkedUserId: contact.linked_user_id,
      linkedUser: contact.linked_user ? {
        id: contact.linked_user.id,
        email: contact.linked_user.email,
        fullName: [contact.linked_user.first_name, contact.linked_user.middle_name, contact.linked_user.last_name].filter(Boolean).join(' ') || contact.linked_user.email,
        avatarUrl: contact.linked_user.avatar_url,
      } : null,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
    }));

    return NextResponse.json(transformedContacts, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      }
    });
  } catch (error) {
    console.error('[OrgContacts API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create a new contact for an organization
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Transform frontend format to database format
    const contactData = {
      organization_id: organizationId,
      type: body.type || '1',
      title: body.title,
      first_name: body.firstName,
      middle_name: body.middleName,
      last_name: body.lastName,
      job_title: body.jobTitle,
      department: body.department,
      email: body.email,
      phone: body.phone,
      phone_number: body.phoneNumber,
      country_code: body.countryCode,
      website: body.website,
      mailing_address: body.mailingAddress,
      profile_photo: body.profilePhoto,
      notes: body.notes,
      linked_user_id: body.linkedUserId,
      is_primary: body.isPrimary || false,
      display_order: body.displayOrder || 0,
    };

    const { data: contact, error } = await supabase
      .from('organization_contacts')
      .insert(contactData)
      .select()
      .single();

    if (error) {
      console.error('[OrgContacts API] Error creating contact:', error);
      return NextResponse.json(
        { error: 'Failed to create contact' },
        { status: 500 }
      );
    }

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('[OrgContacts API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PUT - Update a contact
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const contactId = body.id;

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    // Transform frontend format to database format
    const contactData: Record<string, any> = {};
    if (body.type !== undefined) contactData.type = body.type;
    if (body.title !== undefined) contactData.title = body.title;
    if (body.firstName !== undefined) contactData.first_name = body.firstName;
    if (body.middleName !== undefined) contactData.middle_name = body.middleName;
    if (body.lastName !== undefined) contactData.last_name = body.lastName;
    if (body.jobTitle !== undefined) contactData.job_title = body.jobTitle;
    if (body.department !== undefined) contactData.department = body.department;
    if (body.email !== undefined) contactData.email = body.email;
    if (body.phone !== undefined) contactData.phone = body.phone;
    if (body.phoneNumber !== undefined) contactData.phone_number = body.phoneNumber;
    if (body.countryCode !== undefined) contactData.country_code = body.countryCode;
    if (body.website !== undefined) contactData.website = body.website;
    if (body.mailingAddress !== undefined) contactData.mailing_address = body.mailingAddress;
    if (body.profilePhoto !== undefined) contactData.profile_photo = body.profilePhoto;
    if (body.notes !== undefined) contactData.notes = body.notes;
    if (body.linkedUserId !== undefined) contactData.linked_user_id = body.linkedUserId;
    if (body.isPrimary !== undefined) contactData.is_primary = body.isPrimary;
    if (body.displayOrder !== undefined) contactData.display_order = body.displayOrder;

    const { data: contact, error } = await supabase
      .from('organization_contacts')
      .update(contactData)
      .eq('id', contactId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('[OrgContacts API] Error updating contact:', error);
      return NextResponse.json(
        { error: 'Failed to update contact' },
        { status: 500 }
      );
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('[OrgContacts API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const { error } = await supabase
      .from('organization_contacts')
      .delete()
      .eq('id', contactId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[OrgContacts API] Error deleting contact:', error);
      return NextResponse.json(
        { error: 'Failed to delete contact' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[OrgContacts API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
