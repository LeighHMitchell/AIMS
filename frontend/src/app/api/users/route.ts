import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering to ensure environment variables are always loaded
export const dynamic = 'force-dynamic';

// Set maximum request body size to 10MB for profile pictures
export const maxDuration = 60;

// Configure route segment for larger body size
export const runtime = 'nodejs';

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

// SECURITY: Default role for new users created by non-admins
const DEFAULT_ROLE = 'public_user';

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// SECURITY: Validate role value against allowed enum
function isValidRole(role: unknown): role is typeof VALID_ROLES[number] {
  return typeof role === 'string' && VALID_ROLES.includes(role as any);
}

export async function GET(request: NextRequest) {
  console.log('[AIMS] GET /api/users - Starting request (Supabase)');

  const { supabase, response } = await requireAuth();
  if (response) return response;

  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    let query = supabase.from('users').select(`
      *,
      organizations:organization_id (
        id,
        name,
        acronym,
        logo,
        type,
        country
      )
    `);

    if (email) {
      query = query.eq('email', email).single();
    }

    const { data, error } = await query;

    if (error) {
      console.error('[AIMS] Error from Supabase:', error);
      if (error.code === 'PGRST116' && email) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Transform data to match frontend User type expectations
    const transformUser = (user: any) => ({
      ...user,
      name: user.name || `${user.first_name || ''} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name || ''}`.trim() || user.email,
      firstName: user.first_name,
      middleName: user.middle_name,
      lastName: user.last_name,
      suffix: user.suffix,
      gender: user.gender,
      profilePicture: user.avatar_url,
      authProvider: user.auth_provider,
      organisation: user.organisation || user.organizations?.name,
      organization: user.organizations,
      contactType: user.contact_type,
      faxNumber: user.fax_number,
      notes: user.notes,
      mailingAddress: user.mailing_address,
      addressLine1: user.address_line_1,
      addressLine2: user.address_line_2,
      city: user.city,
      stateProvince: user.state_province,
      country: user.country,
      postalCode: user.postal_code
    });

    const transformedData = Array.isArray(data)
      ? data.map(transformUser)
      : transformUser(data);

    console.log('[AIMS] Successfully fetched from Supabase');
    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[AIMS] POST /api/users - Starting request (Supabase)');

  const { supabase, user: authUser, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase || !authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get admin client for auth operations (requires service role key)
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin client not configured' },
        { status: 500 }
      );
    }

    // SECURITY: Fetch authenticated user's role to check permissions
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

    const body = await request.json();

    console.log('[AIMS] Creating user with email:', body.email);

    // Check if user with this email already exists
    const { data: existingUsers, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', body.email);

    if (existingUsers && existingUsers.length > 0) {
      console.log('[AIMS] User profile already exists with email:', body.email);
      return NextResponse.json(
        { error: 'A user with this email address already exists' },
        { status: 409 }
      );
    }

    // Create auth user first
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password || `TempPass${Date.now()}!`,
      email_confirm: true,
    });

    if (authError) {
      console.error('[AIMS] Error creating auth user:', authError);
      if (authError.message?.includes('already been registered') ||
          authError.message?.includes('already exists') ||
          authError.message?.includes('unique constraint') ||
          authError.code === 'email_exists') {
        return NextResponse.json(
          { error: 'A user with this email address already exists.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    console.log('[AIMS] Created auth user with ID:', authData.user.id);

    // SECURITY: Determine role with proper authorization
    let assignedRole = DEFAULT_ROLE;

    if (body.role !== undefined) {
      if (!isSuperUser) {
        // Non-admin trying to set a role - log and use default
        console.warn(`[AIMS] PRIVILEGE ESCALATION BLOCKED: User ${authUser.id} (role: ${authUserProfile.role}) attempted to create user with role "${body.role}"`);
        // Use default role, don't return error to avoid leaking info
        assignedRole = DEFAULT_ROLE;
      } else {
        // Super user can set roles - validate the value
        if (!isValidRole(body.role)) {
          console.warn(`[AIMS] Invalid role value rejected: "${body.role}"`);
          // Clean up the auth user we just created
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          return NextResponse.json(
            { error: `Invalid role value: ${body.role}` },
            { status: 400 }
          );
        }
        assignedRole = body.role;
        console.log(`[AIMS] Role assignment authorized: Super user ${authUser.id} creating user with role ${assignedRole}`);
      }
    }

    // Build the profile update data with explicit field allowlist
    const userProfileData: Record<string, any> = {
      email: body.email,
      first_name: body.first_name || '',
      last_name: body.last_name || '',
      role: assignedRole,  // SECURITY: Server-controlled role assignment
      organization_id: body.organization_id || null,
      organisation: body.organisation || null,
      department: body.department || null,
      job_title: body.job_title || null,
      telephone: body.telephone || null,
      website: body.website || null,
      mailing_address: body.mailing_address || null,
      updated_at: new Date().toISOString()
    };

    // Add optional fields if they exist in the request
    if (body.title !== undefined) userProfileData.title = body.title === 'none' ? null : body.title;
    if (body.middle_name !== undefined) userProfileData.middle_name = body.middle_name;
    if (body.suffix !== undefined) userProfileData.suffix = body.suffix === 'none' ? null : body.suffix;
    if (body.contact_type !== undefined) userProfileData.contact_type = body.contact_type === 'none' ? null : body.contact_type;
    if (body.fax_number !== undefined) userProfileData.fax_number = body.fax_number;
    if (body.notes !== undefined) userProfileData.notes = body.notes;
    if (body.avatar_url !== undefined) userProfileData.avatar_url = body.avatar_url;

    // Add address component fields
    if (body.address_line_1 !== undefined) userProfileData.address_line_1 = body.address_line_1;
    if (body.address_line_2 !== undefined) userProfileData.address_line_2 = body.address_line_2;
    if (body.city !== undefined) userProfileData.city = body.city;
    if (body.state_province !== undefined) userProfileData.state_province = body.state_province;
    if (body.country !== undefined) userProfileData.country = body.country;
    if (body.postal_code !== undefined) userProfileData.postal_code = body.postal_code;

    // Update the profile that was auto-created by the database trigger
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(userProfileData)
      .eq('id', authData.user.id)
      .select()
      .single();

    if (error) {
      console.error('[AIMS] Error updating user profile:', error);
      // Clean up auth user if profile update fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log('[AIMS] Created user in Supabase:', data.email, 'with role:', data.role);
    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  console.log('[AIMS] PUT /api/users - Starting request (Supabase)');

  const { supabase, user: authUser, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase || !authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Handle potentially large request body
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Request body too large. Maximum size is 10MB.' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const targetUserId = body.id;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // SECURITY: Validate target user ID format
    if (!isValidUUID(targetUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
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

    console.log('[AIMS] PUT /api/users - Updating user:', targetUserId);

    // SECURITY: Build update data with explicit field allowlist (no mass assignment)
    const dbUpdateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    // Explicitly copy only allowed fields (defense against mass assignment)
    const allowedFields = [
      'first_name', 'last_name', 'middle_name', 'title', 'suffix',
      'organization_id', 'organisation', 'department', 'job_title',
      'telephone', 'website', 'mailing_address', 'avatar_url',
      'contact_type', 'fax_number', 'notes',
      'address_line_1', 'address_line_2', 'city', 'state_province', 'country', 'postal_code',
      'default_activity_columns'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if ((field === 'title' || field === 'suffix' || field === 'contact_type') && body[field] === 'none') {
          dbUpdateData[field] = null;
        } else {
          dbUpdateData[field] = body[field];
        }
      }
    }

    // Handle profile picture mapping
    if (body.profile_picture !== undefined) {
      dbUpdateData.avatar_url = body.profile_picture;
    }

    // SECURITY: Role handling - only super_user can change roles
    if (body.role !== undefined) {
      if (!isSuperUser) {
        console.warn(`[AIMS] PRIVILEGE ESCALATION BLOCKED: User ${authUser.id} (role: ${authUserProfile.role}) attempted to set role to "${body.role}"`);
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to change user roles' },
          { status: 403 }
        );
      }

      // Validate role value
      if (!isValidRole(body.role)) {
        console.warn(`[AIMS] Invalid role value rejected: "${body.role}"`);
        return NextResponse.json(
          { error: `Invalid role value: ${body.role}` },
          { status: 400 }
        );
      }

      // SECURITY: Prevent self-role-escalation
      if (isOwnProfile && body.role === 'super_user' && authUserProfile.role !== 'super_user') {
        console.warn(`[AIMS] SELF-ESCALATION BLOCKED: User ${authUser.id} attempted to make themselves super_user`);
        return NextResponse.json(
          { error: 'Forbidden: Cannot escalate your own privileges' },
          { status: 403 }
        );
      }

      dbUpdateData.role = body.role;
      console.log(`[AIMS] Role change authorized: User ${authUser.id} setting ${targetUserId} role to ${body.role}`);
    }

    // Verify organization exists if organization_id is being set
    if (dbUpdateData.organization_id) {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', dbUpdateData.organization_id)
        .single();

      if (orgError || !orgData) {
        console.error('[AIMS] Organization not found:', dbUpdateData.organization_id);
        return NextResponse.json(
          { error: `Organization not found: ${dbUpdateData.organization_id}` },
          { status: 400 }
        );
      }

      dbUpdateData.organisation = orgData.name;
    } else if (dbUpdateData.organization_id === null) {
      dbUpdateData.organisation = null;
    }

    // Update user profile
    const { data, error } = await supabase
      .from('users')
      .update(dbUpdateData)
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
      console.error('[AIMS] Supabase error updating user:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No data returned from update' },
        { status: 500 }
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
      authProvider: data.auth_provider,
      organisation: data.organisation || data.organizations?.name,
      organization: data.organizations,
      contactType: data.contact_type,
      faxNumber: data.fax_number,
      notes: data.notes,
      mailingAddress: data.mailing_address,
      addressLine1: data.address_line_1,
      addressLine2: data.address_line_2,
      city: data.city,
      stateProvince: data.state_province,
      country: data.country,
      postalCode: data.postal_code
    };

    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  console.log('[AIMS] DELETE /api/users - Starting request (Supabase)');

  const { supabase, user: authUser, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase || !authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get admin client for auth operations (requires service role key)
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin client not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get('id');

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // SECURITY: Validate target user ID format
    if (!isValidUUID(targetUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
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

    console.log('[AIMS] DELETE /api/users - Super user deleting user:', targetUserId);

    // Clean up activity_logs to avoid FK constraint violation
    const { error: activityLogsError } = await supabase
      .from('activity_logs')
      .update({ user_id: null })
      .eq('user_id', targetUserId);

    if (activityLogsError) {
      console.error('[AIMS] Error cleaning up activity_logs:', activityLogsError);
    }

    // Delete from users table
    const { error: profileDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', targetUserId);

    if (profileDeleteError) {
      console.error('[AIMS] Error deleting user profile:', profileDeleteError);
      return NextResponse.json(
        { error: profileDeleteError.message },
        { status: 400 }
      );
    }

    // Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (authError) {
      console.error('[AIMS] Error deleting auth user:', authError);
      return NextResponse.json(
        {
          error: `User profile deleted but failed to delete authentication record: ${authError.message}`,
          partialSuccess: true
        },
        { status: 500 }
      );
    }

    console.log('[AIMS] Successfully deleted user:', targetUserId);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
