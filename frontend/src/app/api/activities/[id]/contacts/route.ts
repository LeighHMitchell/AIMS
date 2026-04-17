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


    // Get a fresh Supabase admin client to avoid stale connections

    // Fetch contacts via junction table with contacts join

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
            acronym,
            logo
          )
        ),
        organizations:organisation_id (
          id,
          name,
          acronym,
          logo
        ),
        users:user_id (
          id,
          job_title
        )
      `, { count: 'exact' });

    const filteredQuery = queryBuilder.eq('activity_id', activityId);
    const orderedQuery = filteredQuery.order('created_at', { ascending: true });

    const { data: contacts, error, count } = await orderedQuery;

    if (error) {
      console.error('[Contacts API] Error fetching contacts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      );
    }


    // Look up users by email so we can surface their job_title even when user_id
    // isn't set on the activity_contacts row (legacy records).
    const contactEmails = Array.from(new Set(
      (contacts || [])
        .map((c: any) => (c.contacts?.email || c.primary_email || c.email || '').toLowerCase())
        .filter(Boolean)
    ));
    const usersByEmail = new Map<string, any>();
    if (contactEmails.length > 0) {
      const { data: emailUsers } = await supabase
        .from('users')
        .select('id, email, job_title')
        .in('email', contactEmails);
      (emailUsers || []).forEach((u: any) => {
        if (u.email) usersByEmail.set(u.email.toLowerCase(), u);
      });
    }

    // Resolve organization logos by name for contacts that have org text but no organisation_id
    const orgNames = Array.from(new Set(
      (contacts || [])
        .map((c: any) => {
          const hasJoined = c.contacts?.organizations || c.organizations;
          if (hasJoined) return null;
          return c.contacts?.organisation || c.organisation_name || c.organisation || null;
        })
        .filter(Boolean)
        .map((n: string) => n.trim())
    ));
    const orgsByName = new Map<string, any>();
    if (orgNames.length > 0) {
      const { data: namedOrgs } = await supabase
        .from('organizations')
        .select('id, name, acronym, logo')
        .in('name', orgNames);
      (namedOrgs || []).forEach((o: any) => {
        if (o.name) orgsByName.set(o.name.toLowerCase(), o);
      });
    }

    // Transform: prefer data from contacts table, fallback to activity_contacts columns
    // Values that historically leaked into `position` from users.role — never display these
    const USER_ROLE_VALUES = new Set([
      'super_user', 'admin', 'orphan',
      'dev_partner_tier_1', 'dev_partner_tier_2',
      'gov_partner_tier_1', 'gov_partner_tier_2',
    ]);
    const cleanPosition = (v: any) => {
      if (!v) return v;
      return USER_ROLE_VALUES.has(String(v)) ? null : v;
    };
    const clean = cleanPosition;

    const transformedContacts = (contacts || []).map((contact: any) => {
      const c = contact.contacts; // joined contacts record (may be null for pre-migration rows)
      const rawOrgName = (c?.organisation || contact.organisation_name || contact.organisation || '').trim();
      const orgData = c?.organizations || contact.organizations || (rawOrgName ? orgsByName.get(rawOrgName.toLowerCase()) : null);
      const contactEmail = (c?.email || contact.primary_email || contact.email || '').toLowerCase();
      const emailUser = contactEmail ? usersByEmail.get(contactEmail) : null;
      const linkedUserJobTitle = contact.users?.job_title || emailUser?.job_title || null;
      const safePosition = clean(c?.position) || clean(contact.position) || null;
      const safeContactsJobTitle = clean(c?.job_title);
      const safeAcJobTitle = clean(contact.job_title);
      const resolvedJobTitle = safeContactsJobTitle || safeAcJobTitle || linkedUserJobTitle || safePosition || null;

      return {
        id: contact.id,
        contactId: c?.id || contact.contact_id,
        type: contact.type,
        title: c?.title || contact.title,
        firstName: c?.first_name || contact.first_name,
        lastName: c?.last_name || contact.last_name,
        jobTitle: resolvedJobTitle,
        position: safePosition,
        department: c?.department || contact.department,
        organisation: orgData?.name || c?.organisation || contact.organisation_name || contact.organisation,
        organisationId: c?.organisation_id || contact.organisation_id,
        organisationAcronym: orgData?.acronym || contact.organisation_acronym,
        organisationLogo: orgData?.logo || null,
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

    if (transformedContacts.length > 0) {
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

