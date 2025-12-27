import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[OAuth User] ========================================');
  console.log('[OAuth User] POST /api/auth/create-oauth-user - Starting');
  console.log('[OAuth User] Timestamp:', new Date().toISOString());
  
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[OAuth User] ERROR: Supabase admin client is not configured');
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }
    console.log('[OAuth User] Supabase admin client initialized');

    const body = await request.json();
    console.log('[OAuth User] Request body:', JSON.stringify(body, null, 2));
    
    const { id, email, first_name, last_name, avatar_url } = body;

    // Validate required fields
    if (!id) {
      console.error('[OAuth User] ERROR: Missing user ID');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    if (!email) {
      console.error('[OAuth User] ERROR: Missing email');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('[OAuth User] Validated - ID:', id, 'Email:', email);

    // Check if user already exists by ID
    console.log('[OAuth User] Checking for existing user by ID...');
    const { data: existingUserById, error: checkByIdError } = await supabase
      .from('users')
      .select('id, email, role, first_name, last_name')
      .eq('id', id)
      .maybeSingle();

    if (checkByIdError) {
      console.error('[OAuth User] Error checking user by ID:', checkByIdError);
    }

    if (existingUserById) {
      console.log('[OAuth User] User already exists by ID:', existingUserById.email);
      
      // Update last_login timestamp and get full user data
      const { data: fullUser, error: fullUserError } = await supabase
        .from('users')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Also update avatar if it changed
          ...(avatar_url && { avatar_url })
        })
        .eq('id', id)
        .select(`
          *,
          organizations:organization_id (
            id,
            name,
            acronym,
            type,
            country
          )
        `)
        .single();

      if (fullUserError) {
        console.error('[OAuth User] Error updating/fetching full user data:', fullUserError);
        return NextResponse.json(existingUserById);
      }

      console.log('[OAuth User] Updated last_login for user:', fullUser.email);

      // Transform to match frontend expectations
      const transformedUser = {
        ...fullUser,
        name: fullUser.name || `${fullUser.first_name || ''} ${fullUser.last_name || ''}`.trim() || email,
        firstName: fullUser.first_name,
        lastName: fullUser.last_name,
        profilePicture: fullUser.avatar_url,
        lastLogin: fullUser.last_login,
        authProvider: fullUser.auth_provider || 'google',
        organisation: fullUser.organisations || fullUser.organizations?.name,
        organization: fullUser.organizations,
      };

      console.log('[OAuth User] Returning existing user:', transformedUser.email);
      return NextResponse.json(transformedUser);
    }

    // Also check by email (in case of ID mismatch from previous auth)
    console.log('[OAuth User] Checking for existing user by email...');
    const { data: existingUserByEmail, error: checkByEmailError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (checkByEmailError) {
      console.error('[OAuth User] Error checking user by email:', checkByEmailError);
    }

    if (existingUserByEmail) {
      console.log('[OAuth User] User exists with different ID. Existing ID:', existingUserByEmail.id, 'New ID:', id);
      // Update the existing user's ID to match the new auth ID and update last_login
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ 
          id: id, 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(avatar_url && { avatar_url })
        })
        .eq('email', email)
        .select(`
          *,
          organizations:organization_id (
            id,
            name,
            acronym,
            type,
            country
          )
        `)
        .single();

      if (updateError) {
        console.error('[OAuth User] Error updating user ID:', updateError);
        // Still return the existing user data
        return NextResponse.json({
          ...existingUserByEmail,
          name: email.split('@')[0],
          firstName: first_name || '',
          lastName: last_name || '',
          role: 'dev_partner_tier_2',
          isActive: true,
        });
      }

      console.log('[OAuth User] Updated user ID and last_login for:', updatedUser.email);

      const transformedUser = {
        ...updatedUser,
        name: updatedUser.name || `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim() || email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        profilePicture: updatedUser.avatar_url,
        lastLogin: updatedUser.last_login,
        authProvider: updatedUser.auth_provider || 'google',
        organisation: updatedUser.organisations || updatedUser.organizations?.name,
        organization: updatedUser.organizations,
      };

      console.log('[OAuth User] Updated and returning user:', transformedUser.email);
      return NextResponse.json(transformedUser);
    }

    // Create new user profile
    console.log('[OAuth User] Creating new user profile...');
    const now = new Date().toISOString();
    const newUser = {
      id,
      email,
      first_name: first_name || email.split('@')[0],
      last_name: last_name || '',
      avatar_url: avatar_url || null,
      role: 'public_user', // Default role for new OAuth users (read-only access)
      auth_provider: 'google', // Track that this user signed in via Google OAuth
      last_login: now,
      created_at: now,
      updated_at: now,
    };

    console.log('[OAuth User] New user data:', JSON.stringify(newUser, null, 2));

    const { data, error } = await supabase
      .from('users')
      .insert(newUser)
      .select()
      .single();

    if (error) {
      console.error('[OAuth User] ERROR creating user:');
      console.error('[OAuth User] Error code:', error.code);
      console.error('[OAuth User] Error message:', error.message);
      console.error('[OAuth User] Error details:', error.details);
      console.error('[OAuth User] Error hint:', error.hint);
      
      // Check if it's a duplicate key error
      if (error.code === '23505') {
        console.log('[OAuth User] Duplicate key error - user may already exist');
        // Try to fetch the existing user
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .or(`id.eq.${id},email.eq.${email}`)
          .single();
        
        if (existingUser) {
          console.log('[OAuth User] Found existing user after duplicate error');
          return NextResponse.json({
            ...existingUser,
            name: `${existingUser.first_name || ''} ${existingUser.last_name || ''}`.trim() || email,
            firstName: existingUser.first_name,
            lastName: existingUser.last_name,
            profilePicture: existingUser.avatar_url,
          });
        }
      }
      
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: 400 }
      );
    }

    console.log('[OAuth User] SUCCESS - User created:', data.email);
    console.log('[OAuth User] Created user ID:', data.id);

    // Transform to match frontend expectations
    const transformedUser = {
      ...data,
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || email,
      firstName: data.first_name,
      lastName: data.last_name,
      profilePicture: data.avatar_url,
      lastLogin: data.last_login,
      authProvider: data.auth_provider || 'google',
    };

    console.log('[OAuth User] ========================================');
    return NextResponse.json(transformedUser, { status: 201 });

  } catch (error) {
    console.error('[OAuth User] ========================================');
    console.error('[OAuth User] UNEXPECTED ERROR:', error);
    console.error('[OAuth User] Error type:', typeof error);
    console.error('[OAuth User] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[OAuth User] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[OAuth User] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('[OAuth User] ========================================');
    
    return NextResponse.json(
      { error: 'Failed to create user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
