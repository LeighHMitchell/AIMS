import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: activityId } = await params;
    
    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    console.log('[Contacts API] 🔍 Fetching contacts for activity:', activityId);
    console.log('[Contacts API] Request timestamp:', new Date().toISOString());
    console.log('[Contacts API] Cache-busting params:', request.nextUrl.searchParams.toString());

    // Get a fresh Supabase admin client to avoid stale connections
    console.log('[Contacts API] Using Supabase admin client');

    // Fetch contacts via junction table with contacts join
    console.log('[Contacts API] Querying activity_contacts with contacts join...');

    const queryBuilder = supabase
      .from('activity_contacts')
      .select(`
        *,
        contacts:contact_id (
          id,
          title,
          first_name,
          middle_name,
          last_name,
          email,
          secondary_email,
          phone,
          phone_number,
          country_code,
          fax,
          position,
          job_title,
          department,
          organisation,
          organisation_id,
          website,
          mailing_address,
          profile_photo,
          notes,
          organizations:organisation_id (
            id,
            name,
            acronym
          )
        ),
        organizations:organisation_id (
          id,
          name,
          acronym
        )
      `, { count: 'exact' });

    const filteredQuery = queryBuilder.eq('activity_id', activityId);
    const orderedQuery = filteredQuery.order('created_at', { ascending: true });

    console.log('[Contacts API] Executing query...');
    const { data: contacts, error, count } = await orderedQuery;

    if (error) {
      console.error('[Contacts API] Error fetching contacts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      );
    }

    console.log('[Contacts API] Found contacts:', contacts?.length || 0);

    // Transform: prefer data from contacts table, fallback to activity_contacts columns
    const transformedContacts = (contacts || []).map((contact: any) => {
      const c = contact.contacts; // joined contacts record (may be null for pre-migration rows)
      const orgData = c?.organizations || contact.organizations;

      return {
        id: contact.id,
        contactId: c?.id || contact.contact_id,
        type: contact.type,
        title: c?.title || contact.title,
        firstName: c?.first_name || contact.first_name,
        lastName: c?.last_name || contact.last_name,
        jobTitle: c?.job_title || contact.job_title || c?.position || contact.position,
        position: c?.position || contact.position,
        department: c?.department || contact.department,
        organisation: orgData?.name || c?.organisation || contact.organisation_name || contact.organisation,
        organisationId: c?.organisation_id || contact.organisation_id,
        organisationAcronym: orgData?.acronym || contact.organisation_acronym,
        email: c?.email || contact.primary_email || contact.email,
        phone: c?.phone_number || c?.phone || contact.phone_number || contact.phone,
        phoneNumber: c?.phone_number || contact.phone_number || contact.phone,
        countryCode: c?.country_code || contact.country_code,
        website: c?.website || contact.website,
        mailingAddress: c?.mailing_address || contact.mailing_address,
        profilePhoto: c?.profile_photo || contact.profile_photo,
        isFocalPoint: contact.is_focal_point,
        importedFromIati: contact.imported_from_iati || false,
      };
    });

    console.log('[Contacts API] 📤 Returning', transformedContacts.length, 'transformed contact(s)');
    if (transformedContacts.length > 0) {
      console.log('[Contacts API] Sample transformed contact:', JSON.stringify(transformedContacts[0], null, 2));
      console.log('[Contacts API] All contact IDs being returned:', transformedContacts.map((c: any) => c.id));
    }

    return NextResponse.json(transformedContacts, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('[Contacts API] ❌ Unexpected error:', error);
    if (error instanceof Error) {
      console.error('[Contacts API] Error message:', error.message);
      console.error('[Contacts API] Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

