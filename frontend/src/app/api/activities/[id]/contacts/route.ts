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

    // Fetch contacts with organization data
    console.log('[Contacts API] Querying activity_contacts table with organization join...');
    
    const queryBuilder = supabase
      .from('activity_contacts')
      .select(`
        *,
        organizations:organisation_id (
          id,
          name,
          acronym
        )
      `, { count: 'exact' });
    
    // Apply activity_id filter
    const filteredQuery = queryBuilder.eq('activity_id', activityId);
    
    // Order results
    const orderedQuery = filteredQuery.order('created_at', { ascending: true });
    
    console.log('[Contacts API] Executing query...');
    const { data: contacts, error, count } = await orderedQuery;
    
    console.log('[Contacts API] ========== QUERY RESULTS ==========');
    console.log('[Contacts API] Count from query:', count);
    console.log('[Contacts API] Data array length:', contacts?.length);
    console.log('[Contacts API] Error:', error);
    console.log('[Contacts API] Full data array:', JSON.stringify(contacts, null, 2));
    console.log('[Contacts API] =====================================');

    if (error) {
      console.error('[Contacts API] ❌ Error fetching contacts:', error);
      console.error('[Contacts API] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      );
    }

    console.log('[Contacts API] ✅ Query successful. Found contacts:', contacts?.length || 0);
    if (contacts && contacts.length > 0) {
      console.log('[Contacts API] Sample contact data (first contact):', JSON.stringify(contacts[0], null, 2));
    } else {
      console.warn('[Contacts API] ⚠️ No contacts found in database for activity:', activityId);
    }

    // Transform database format to frontend format (simplified fields only)
    const transformedContacts = (contacts || []).map((contact: any) => {
      return {
        id: contact.id,
        type: contact.type,
        title: contact.title,
        firstName: contact.first_name,
        lastName: contact.last_name,
        jobTitle: contact.job_title || contact.position, // Backward compatibility
        position: contact.position, // Keep for backward compatibility
        department: contact.department,
        organisation: contact.organizations?.name || contact.organisation_name || contact.organisation,
        organisationId: contact.organisation_id,
        organisationAcronym: contact.organizations?.acronym || contact.organisation_acronym,
        email: contact.primary_email || contact.email,
        phone: contact.phone_number || contact.phone,
        phoneNumber: contact.phone_number || contact.phone,
        countryCode: contact.country_code,
        website: contact.website,
        mailingAddress: contact.mailing_address,
        profilePhoto: contact.profile_photo,
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

