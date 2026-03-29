import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('working_group_memberships')
      .select('*')
      .eq('working_group_id', id)
      .order('role', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const members = data || [];

    // Enrich with contact/user data for members linked via contact_id
    const contactIds = members.filter((m: any) => m.contact_id).map((m: any) => m.contact_id);
    if (contactIds.length > 0) {
      // Try contacts table first
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, job_title, department, organisation, organisation_id, profile_photo, organizations:organisation_id(name, acronym)')
        .in('id', contactIds);

      // Also try users table (contact_id might be a user ID)
      const { data: users } = await supabase
        .from('users')
        .select('id, job_title, department, organization_id, avatar_url, organizations!users_organization_id_fkey(name, acronym)')
        .in('id', contactIds);

      const contactMap = new Map<string, any>();
      if (contacts) {
        contacts.forEach((c: any) => {
          contactMap.set(c.id, {
            job_title: c.job_title,
            department: c.department,
            organization_name: (c.organizations as any)?.name || c.organisation || null,
            organization_acronym: (c.organizations as any)?.acronym || null,
            avatar_url: c.profile_photo || null,
          });
        });
      }
      if (users) {
        users.forEach((u: any) => {
          if (!contactMap.has(u.id)) {
            contactMap.set(u.id, {
              job_title: u.job_title,
              department: u.department,
              organization_name: (u.organizations as any)?.name || null,
              organization_acronym: (u.organizations as any)?.acronym || null,
              avatar_url: u.avatar_url || null,
            });
          }
        });
      }

      // Merge contact data into membership records
      members.forEach((m: any) => {
        if (m.contact_id && contactMap.has(m.contact_id)) {
          const contact = contactMap.get(m.contact_id);
          // Only fill in missing fields - don't overwrite explicit values
          if (!m.person_organization && contact.organization_name) {
            m.person_organization = contact.organization_acronym
              ? `${contact.organization_name} (${contact.organization_acronym})`
              : contact.organization_name;
          }
          m.job_title = contact.job_title || null;
          m.department = contact.department || null;
          m.avatar_url = contact.avatar_url || null;
        }
      });
    }

    return NextResponse.json(members);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.person_name) {
      return NextResponse.json({ error: 'person_name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('working_group_memberships')
      .insert([{
        working_group_id: id,
        person_name: body.person_name,
        person_email: body.person_email || null,
        person_organization: body.person_organization || null,
        role: body.role || 'member',
        joined_on: body.joined_on || new Date().toISOString().split('T')[0],
        is_active: true,
        contact_id: body.contact_id || null,
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
