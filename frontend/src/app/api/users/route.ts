import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Force dynamic rendering to ensure environment variables are always loaded
export const dynamic = 'force-dynamic';

// Set maximum request body size to 10MB for profile pictures
export const maxDuration = 60; // Maximum allowed duration for Vercel Hobby is 60 seconds

// Configure route segment for larger body size
export const runtime = 'nodejs'; // Use Node.js runtime for better body parsing

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
      profilePicture: user.avatar_url, // Map avatar_url to profilePicture
      authProvider: user.auth_provider, // Track how user authenticates
      organisation: user.organisation || user.organizations?.name,
      organization: user.organizations,
      contactType: user.contact_type,
      faxNumber: user.fax_number,
      notes: user.notes,
      // Address component fields
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
    // Debug: Log address fields for first user
    if (Array.isArray(data) && data.length > 0) {
      console.log('[AIMS] Sample user address fields from DB:', {
        address_line_1: data[0].address_line_1,
        address_line_2: data[0].address_line_2,
        city: data[0].city,
        state_province: data[0].state_province,
        country: data[0].country,
        postal_code: data[0].postal_code,
        mailing_address: data[0].mailing_address
      });
    }
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
  
  const { supabase, response } = await requireAuth();
  if (response) return response;
  
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    
    // Create auth user first
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password || `TempPass${Date.now()}!`,
      email_confirm: true,
    });
    
    if (authError) {
      console.error('[AIMS] Error creating auth user:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }
    
    // Create user profile with all available fields
    const userProfileData: any = {
      id: authData.user.id,
      email: body.email,
      first_name: body.first_name || '',
      last_name: body.last_name || '',
      role: body.role || 'dev_partner_tier_1',
      organization_id: body.organization_id || null,
      organisation: body.organisation || null,
      department: body.department || null,
      job_title: body.job_title || null, // Position maps to job_title
      telephone: body.telephone || null,
      website: body.website || null,
      mailing_address: body.mailing_address || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Add optional fields if they exist in the request
    if (body.title !== undefined) userProfileData.title = body.title === 'none' ? null : body.title
    if (body.middle_name !== undefined) userProfileData.middle_name = body.middle_name
    if (body.suffix !== undefined) userProfileData.suffix = body.suffix === 'none' ? null : body.suffix
    if (body.contact_type !== undefined) userProfileData.contact_type = body.contact_type === 'none' ? null : body.contact_type

    if (body.fax_number !== undefined) userProfileData.fax_number = body.fax_number
    if (body.notes !== undefined) userProfileData.notes = body.notes
    if (body.avatar_url !== undefined) userProfileData.avatar_url = body.avatar_url

    // Add address component fields
    if (body.address_line_1 !== undefined) userProfileData.address_line_1 = body.address_line_1
    if (body.address_line_2 !== undefined) userProfileData.address_line_2 = body.address_line_2
    if (body.city !== undefined) userProfileData.city = body.city
    if (body.state_province !== undefined) userProfileData.state_province = body.state_province
    if (body.country !== undefined) userProfileData.country = body.country
    if (body.postal_code !== undefined) userProfileData.postal_code = body.postal_code

    const { data, error } = await supabase
      .from('users')
      .insert(userProfileData)
      .select()
      .single();
    
    if (error) {
      console.error('[AIMS] Error creating user profile:', error);
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    console.log('[AIMS] Created user in Supabase:', data.email);
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
  
  const { supabase, response } = await requireAuth();
  if (response) return response;
  
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
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
    console.log('[AIMS] PUT /api/users - Received body:', body);
    
    const { id, profile_picture, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS] PUT /api/users - updateData after destructuring:', updateData);
    console.log('[AIMS] PUT /api/users - department in updateData:', updateData.department);
    console.log('[AIMS] PUT /api/users - organization_id in updateData:', updateData.organization_id);
    
    // Map frontend field names to database column names
    const dbUpdateData = {
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    // Ensure the new fields are included if provided
    if ('contact_type' in updateData) dbUpdateData.contact_type = updateData.contact_type;
    if ('fax_number' in updateData) dbUpdateData.fax_number = updateData.fax_number;
    if ('notes' in updateData) dbUpdateData.notes = updateData.notes;
    if ('suffix' in updateData) dbUpdateData.suffix = updateData.suffix === 'none' ? null : updateData.suffix;
    
    console.log('[AIMS] PUT /api/users - dbUpdateData being sent to database:', dbUpdateData);
    console.log('[AIMS] PUT /api/users - organization_id in dbUpdateData:', dbUpdateData.organization_id);
    
    // Handle profile picture mapping
    if (profile_picture !== undefined) {
      dbUpdateData.avatar_url = profile_picture;
    }
    
    // Verify organization exists if organization_id is being set
    if (dbUpdateData.organization_id) {
      console.log('[AIMS] Verifying organization exists:', dbUpdateData.organization_id);
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', dbUpdateData.organization_id)
        .single();
      
      if (orgError || !orgData) {
        console.error('[AIMS] Organization not found:', dbUpdateData.organization_id, orgError);
        return NextResponse.json(
          { error: `Organization not found: ${dbUpdateData.organization_id}` },
          { status: 400 }
        );
      }
      console.log('[AIMS] Organization verified:', orgData);
      
      // Also set the organisation text field for backward compatibility
      dbUpdateData.organisation = orgData.name;
      console.log('[AIMS] Setting organisation text field to:', orgData.name);
    } else if (dbUpdateData.organization_id === null) {
      // If organization_id is being cleared, also clear the organisation text field
      dbUpdateData.organisation = null;
      console.log('[AIMS] Clearing organisation text field');
    }

    // Update user profile
    console.log('[AIMS] About to update user with ID:', id);
    console.log('[AIMS] Update data being sent to Supabase:', JSON.stringify(dbUpdateData, null, 2));
    
    const { data, error } = await supabase
      .from('users')
      .update(dbUpdateData)
      .eq('id', id)
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
      console.error('[AIMS] Error code:', error.code);
      console.error('[AIMS] Error message:', error.message);
      console.error('[AIMS] Error details:', error.details);
      console.error('[AIMS] Error hint:', error.hint);
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: 400 }
      );
    }
    
    if (!data) {
      console.error('[AIMS] No data returned from Supabase update');
      return NextResponse.json(
        { error: 'No data returned from update' },
        { status: 500 }
      );
    }
    
    console.log('[AIMS] Updated user in Supabase - returned data:', data);
    console.log('[AIMS] Department in returned data:', data?.department);
    console.log('[AIMS] Organization ID in returned data:', data?.organization_id);
    
    // Transform data to match frontend User type expectations
    const transformedData = {
      ...data,
      name: data.name || `${data.first_name || ''} ${data.middle_name ? data.middle_name + ' ' : ''}${data.last_name || ''}`.trim() || data.email,
      firstName: data.first_name,
      middleName: data.middle_name,
      lastName: data.last_name,
      suffix: data.suffix,
      gender: data.gender,
      profilePicture: data.avatar_url, // Map avatar_url to profilePicture
      authProvider: data.auth_provider, // Track how user authenticates
      organisation: data.organisation || data.organizations?.name,
      organization: data.organizations,
      contactType: data.contact_type,
      faxNumber: data.fax_number,
      notes: data.notes,
      // Address component fields
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
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // First, clean up activity_logs to avoid FK constraint violation
    // Set user_id to null for any activity logs created by this user
    const { error: activityLogsError } = await supabase
      .from('activity_logs')
      .update({ user_id: null })
      .eq('user_id', id);

    if (activityLogsError) {
      console.error('[AIMS] Error cleaning up activity_logs:', activityLogsError);
      // Continue anyway - the table might not exist or have no records
    }

    // Delete from users table
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (profileError) {
      console.error('[AIMS] Error deleting user profile:', profileError);
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }
    
    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    
    if (authError) {
      console.error('[AIMS] Error deleting auth user:', authError);
      // Profile already deleted, so we continue
    }
    
    console.log('[AIMS] Deleted user in Supabase');
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 