import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { escapeIlikeWildcards } from '@/lib/security-utils';

/**
 * Contact search across both `contacts` and `users` tables.
 * GET /api/contacts/search?q=query&limit=20
 *
 * When `q` is empty or omitted, returns the most recent contacts/users
 * (used for the initial "on focus" dropdown).
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    console.log('[Contacts Search API] Searching for:', query || '(all)', 'limit:', limit);

    // ---- Contacts table ----
    let contactsQuery = supabase
      .from('contacts')
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
        organisation,
        position,
        job_title,
        department,
        profile_photo,
        organizations:organisation_id (
          name,
          acronym
        )
      `)
      .limit(limit)
      .order('last_name', { ascending: true });

    if (query.length >= 2) {
      const escapedQuery = escapeIlikeWildcards(query);
      contactsQuery = contactsQuery.or(
        `first_name.ilike.%${escapedQuery}%,last_name.ilike.%${escapedQuery}%,email.ilike.%${escapedQuery}%,organisation.ilike.%${escapedQuery}%`
      );
    }

    const { data: contacts, error: contactsError } = await contactsQuery;

    if (contactsError) {
      console.error('[Contacts Search API] Contacts error:', contactsError);
    }

    // ---- Users table ----
    let usersQuery = supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        avatar_url,
        job_title,
        department,
        telephone,
        organization_id,
        organizations!users_organization_id_fkey (
          name,
          acronym
        )
      `)
      .not('email', 'is', null)
      .neq('email', '')
      .limit(limit)
      .order('last_name', { ascending: true });

    if (query.length >= 2) {
      const escapedQuery = escapeIlikeWildcards(query);
      usersQuery = usersQuery.or(
        `first_name.ilike.%${escapedQuery}%,last_name.ilike.%${escapedQuery}%,email.ilike.%${escapedQuery}%`
      );
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      console.error('[Contacts Search API] Users error:', usersError);
    }

    // ---- Normalize contacts ----
    const normalizedContacts = (contacts || []).map((contact: any) => {
      const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown Contact';
      const orgName = contact.organizations?.name || contact.organisation || '';
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
        type: '1',
        profilePhoto: contact.profile_photo || '',
        source: 'contact' as const,
        label: orgName
          ? `${fullName} (${contact.email || 'no email'}) - ${orgName}`
          : `${fullName} (${contact.email || 'no email'})`
      };
    });

    // ---- Normalize users ----
    const normalizedUsers = (users || []).map((user: any) => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';
      const orgName = (user.organizations as any)?.name || '';
      const orgAcronym = (user.organizations as any)?.acronym || '';

      return {
        id: user.id,
        title: '',
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phone: user.telephone || '',
        countryCode: '',
        organisation: orgName,
        organisationId: user.organization_id,
        organisationAcronym: orgAcronym,
        position: '',
        jobTitle: user.job_title || '',
        department: user.department || '',
        type: '1',
        profilePhoto: user.avatar_url || '',
        source: 'contact' as const,
        label: orgName
          ? `${fullName} (${user.email || 'no email'}) - ${orgName}`
          : `${fullName} (${user.email || 'no email'})`
      };
    });

    // ---- Combine & deduplicate by email (contacts take priority) ----
    const seenEmails = new Set<string>();
    const combined: typeof normalizedContacts = [];

    for (const contact of normalizedContacts) {
      if (contact.email) {
        seenEmails.add(contact.email.toLowerCase());
      }
      combined.push(contact);
    }

    for (const user of normalizedUsers) {
      if (user.email && seenEmails.has(user.email.toLowerCase())) {
        continue;
      }
      if (user.email) {
        seenEmails.add(user.email.toLowerCase());
      }
      combined.push(user);
    }

    const results = combined.slice(0, limit);

    console.log('[Contacts Search API] Found:', results.length, 'results (', normalizedContacts.length, 'contacts,', normalizedUsers.length, 'users)');

    return NextResponse.json(results);
  } catch (error) {
    console.error('[Contacts Search API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to search contacts' },
      { status: 500 }
    );
  }
}
