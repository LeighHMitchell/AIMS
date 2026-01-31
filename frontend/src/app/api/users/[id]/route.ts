import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic'

// SECURITY: Valid role values - must match USER_ROLES in types/user.ts
const VALID_ROLES = [
  'super_user',
  'admin',  // Legacy admin role
  'dev_partner_tier_1',
  'dev_partner_tier_2',
  'gov_partner_tier_1',
  'gov_partner_tier_2',
  'public_user'
] as const;

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// SECURITY: Validate role value against allowed enum
function isValidRole(role: unknown): role is typeof VALID_ROLES[number] {
  return typeof role === 'string' && VALID_ROLES.includes(role as any);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user: authUser, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { id: targetUserId } = await params;

    // SECURITY: Validate target user ID format
    if (!targetUserId || !isValidUUID(targetUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    if (!supabase || !authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // SECURITY: Fetch authenticated user's role from database
    const { data: authUserProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', authUser.id)
      .single();

    if (profileError || !authUserProfile) {
      console.error('[AIMS] Error fetching auth user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to verify user permissions' },
        { status: 500 }
      );
    }

    const isSuperUser = authUserProfile.role === 'super_user' || authUserProfile.role === 'admin';
    const isOwnProfile = authUser.id === targetUserId;

    // SECURITY: Authorization check - must be own profile OR super_user
    if (!isOwnProfile && !isSuperUser) {
      console.warn(`[AIMS] IDOR attempt blocked: User ${authUser.id} tried to update user ${targetUserId}`);
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own profile' },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log('[AIMS] PUT /api/users/[id] - Update data for user:', targetUserId);

    // SECURITY: Build update data with explicit field allowlist (no mass assignment)
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    // Explicitly copy only allowed fields (defense against mass assignment)
    const allowedFields = [
      'first_name', 'last_name', 'middle_name', 'title', 'suffix',
      'organization_id', 'organisation', 'department', 'job_title',
      'telephone', 'website', 'mailing_address', 'avatar_url',
      'contact_type', 'fax_number', 'notes',
      'address_line_1', 'address_line_2', 'city', 'state_province', 'country', 'postal_code'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Handle special 'none' values
        if ((field === 'title' || field === 'suffix' || field === 'contact_type') && body[field] === 'none') {
          updateData[field] = null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // SECURITY: Role handling - only super_user can change roles
    if (body.role !== undefined) {
      if (!isSuperUser) {
        // Non-admin user attempting to change role
        console.warn(`[AIMS] PRIVILEGE ESCALATION BLOCKED: User ${authUser.id} (role: ${authUserProfile.role}) attempted to set role to "${body.role}"`);
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to change user roles' },
          { status: 403 }
        );
      }

      // Super user is changing a role - validate the role value
      if (!isValidRole(body.role)) {
        console.warn(`[AIMS] Invalid role value rejected: "${body.role}"`);
        return NextResponse.json(
          { error: `Invalid role value: ${body.role}` },
          { status: 400 }
        );
      }

      // SECURITY: Prevent self-role-escalation (even for admins)
      if (isOwnProfile && body.role === 'super_user' && authUserProfile.role !== 'super_user') {
        console.warn(`[AIMS] SELF-ESCALATION BLOCKED: User ${authUser.id} attempted to make themselves super_user`);
        return NextResponse.json(
          { error: 'Forbidden: Cannot escalate your own privileges' },
          { status: 403 }
        );
      }

      updateData.role = body.role;
      console.log(`[AIMS] Role change authorized: User ${authUser.id} setting ${targetUserId} role to ${body.role}`);
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', targetUserId)
      .select(`
        *,
        organizations:organization_id (
          id,
          name,
          acronym,
          logo,
          type,
          country
        )
      `)
      .single();

    if (error) {
      console.error('[AIMS] Error updating user profile:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log('[AIMS] Updated user in Supabase:', data.email);

    // Transform data to match frontend User type expectations
    const transformedData = {
      ...data,
      name: data.name || `${data.first_name || ''} ${data.middle_name ? data.middle_name + ' ' : ''}${data.last_name || ''}`.trim() || data.email,
      firstName: data.first_name,
      middleName: data.middle_name,
      lastName: data.last_name,
      suffix: data.suffix,
      gender: data.gender,
      profilePicture: data.avatar_url,
      organisation: data.organisation || data.organizations?.name,
      organization: data.organizations,
      contactType: data.contact_type,
      faxNumber: data.fax_number,
      notes: data.notes,
      addressLine1: data.address_line_1,
      addressLine2: data.address_line_2,
      city: data.city,
      stateProvince: data.state_province,
      country: data.country,
      postalCode: data.postal_code,
      mailingAddress: data.mailing_address
    };

    return NextResponse.json(transformedData, { status: 200 });

  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user: authUser, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { id: targetUserId } = await params;

    // SECURITY: Validate target user ID format
    if (!targetUserId || !isValidUUID(targetUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    if (!supabase || !authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // SECURITY: Fetch authenticated user's role from database
    const { data: authUserProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', authUser.id)
      .single();

    if (profileError || !authUserProfile) {
      console.error('[AIMS] Error fetching auth user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to verify user permissions' },
        { status: 500 }
      );
    }

    const isSuperUser = authUserProfile.role === 'super_user' || authUserProfile.role === 'admin';

    // SECURITY: Only super_user can delete users via this endpoint
    if (!isSuperUser) {
      console.warn(`[AIMS] Unauthorized delete attempt: User ${authUser.id} tried to delete user ${targetUserId}`);
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can delete user accounts' },
        { status: 403 }
      );
    }

    console.log('[AIMS] DELETE /api/users/[id] - Super user deleting user:', targetUserId);

    // Delete the user profile
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', targetUserId);

    if (deleteError) {
      console.error('[AIMS] Error deleting user profile:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      );
    }

    // Then delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(targetUserId);

    if (authError) {
      console.error('[AIMS] Error deleting auth user:', authError);
      // Profile is already deleted, log but continue
    }

    console.log('[AIMS] Deleted user:', targetUserId);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
