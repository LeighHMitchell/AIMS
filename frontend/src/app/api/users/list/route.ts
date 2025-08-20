import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const roles = searchParams.get('roles') || '';

    // Build query with all the fields we need including organization details
    let query = supabase
      .from('users')
      .select(`
        id, email, role, first_name, last_name, title, organisation, department, job_title, avatar_url, bio, phone, telephone, website,
        organization_id,
        organizations:organization_id (
          id,
          name,
          acronym,
          iati_org_id,
          country
        )
      `)
      .order('first_name', { ascending: true, nullsFirst: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,organisation.ilike.%${search}%,department.ilike.%${search}%`);
    }

    // Add role filter if provided
    if (role) {
      query = query.eq('role', role);
    } else if (roles) {
      // Support multiple roles filter
      const roleList = roles.split(',').map(r => r.trim());
      query = query.in('role', roleList);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('[AIMS] Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Format user data with proper name, organization, and avatar
    const formattedUsers = (users || []).map((user: any) => {
      // Build full name from first_name and last_name
      let fullName = '';
      if (user.first_name || user.last_name) {
        fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      }
      if (!fullName) {
        fullName = user.email; // Fallback to email if no name
      }

      // Get organization info - prefer related organization over simple text field
      const organization = user.organizations || null;
      const organisationFallback = user.organisation || user.department || null;

      return {
        id: user.id,
        name: fullName,
        email: user.email,
        role: user.role,
        title: user.title, // Include title field (Mr., Mrs., Dr., Daw, U, etc.)
        organisation: organisationFallback, // Keep for backward compatibility
        job_title: user.job_title,
        avatar_url: user.avatar_url,
        phone: user.phone || user.telephone,
        website: user.website,
        bio: user.bio,
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          acronym: organization.acronym,
          iati_org_id: organization.iati_org_id,
          country: organization.country
        } : null
      };
    });

    return NextResponse.json({ users: formattedUsers });

  } catch (error) {
    console.error('[AIMS] Error in users list API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
