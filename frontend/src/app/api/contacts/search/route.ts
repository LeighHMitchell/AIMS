import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

/**
 * Contact search across activity_contacts table
 * GET /api/contacts/search?q=query&limit=10
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Require at least 2 characters for search
    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    console.log('[Contacts Search API] Searching activity_contacts for:', query, 'limit:', limit);
    // Search activity_contacts table with organization join
    const { data: contacts, error: contactsError } = await supabase
      .from('activity_contacts')
      .select(`
        id,
        title,
        first_name,
        last_name,
        email,
        phone_number,
        phone,
        country_code,
        organisation_id,
        organisation_name,
        position,
        job_title,
        department,
        type,
        profile_photo,
        organizations:organisation_id (
          name,
          acronym
        )
      `)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,organisation_name.ilike.%${query}%`)
      .limit(limit)
      .order('last_name', { ascending: true });

    if (contactsError) {
      console.error('[Contacts Search API] Contacts error:', contactsError);
      return NextResponse.json(
        { error: 'Failed to search contacts' },
        { status: 500 }
      );
    }

    // Normalize results
    const normalizedContacts = (contacts || []).map((contact: any) => {
      const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown Contact';
      const orgName = contact.organizations?.name || contact.organisation_name || '';
      const orgAcronym = contact.organizations?.acronym || '';
      
      return {
        id: contact.id,
        title: contact.title || '',
        firstName: contact.first_name || '',
        lastName: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone_number || contact.phone || '',
        countryCode: contact.country_code || '',
        organisation: orgName,
        organisationId: contact.organisation_id,
        organisationAcronym: orgAcronym,
        position: contact.position || '',
        jobTitle: contact.job_title || '',
        department: contact.department || '',
        type: contact.type || '1',
        profilePhoto: contact.profile_photo || '',
        source: 'contact' as const,
        label: orgName 
          ? `${fullName} (${contact.email || 'no email'}) - ${orgName}`
          : `${fullName} (${contact.email || 'no email'})`
      };
    });

    console.log('[Contacts Search API] Found:', normalizedContacts.length, 'contacts');

    return NextResponse.json(normalizedContacts);
  } catch (error) {
    console.error('[Contacts Search API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to search contacts' },
      { status: 500 }
    );
  }
}

