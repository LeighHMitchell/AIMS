import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { notifySuperUsersOfNewRegistration } from '@/lib/notifications/user-registration-notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { user: authUser, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, email, first_name, last_name, avatar_url } = body;

    if (!id || id !== authUser!.id) {
      return NextResponse.json(
        { error: 'User ID must match authenticated user' },
        { status: 403 }
      );
    }
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user already exists by ID
    const { data: existingUserById, error: checkByIdError } = await supabase
      .from('users')
      .select('id, email, role, first_name, last_name')
      .eq('id', id)
      .maybeSingle();

    if (checkByIdError) {
      console.error('[OAuth User] Error checking user by ID:', checkByIdError);
    }

    if (existingUserById) {
      const { data: fullUser, error: fullUserError } = await supabase
        .from('users')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
        onboardingCompleted: fullUser.onboarding_completed,
      };

      return NextResponse.json(transformedUser);
    }

    // Check by email -- if found, return the existing user (do NOT overwrite their ID)
    const { data: existingUserByEmail, error: checkByEmailError } = await supabase
      .from('users')
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
      .eq('email', email)
      .maybeSingle();

    if (checkByEmailError) {
      console.error('[OAuth User] Error checking user by email:', checkByEmailError);
    }

    if (existingUserByEmail) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(avatar_url && { avatar_url })
        })
        .eq('email', email);

      if (updateError) {
        console.error('[OAuth User] Error updating last_login by email:', updateError);
      }

      const transformedUser = {
        ...existingUserByEmail,
        name: existingUserByEmail.name || `${existingUserByEmail.first_name || ''} ${existingUserByEmail.last_name || ''}`.trim() || email,
        firstName: existingUserByEmail.first_name,
        lastName: existingUserByEmail.last_name,
        profilePicture: existingUserByEmail.avatar_url,
        lastLogin: existingUserByEmail.last_login,
        authProvider: existingUserByEmail.auth_provider || 'google',
        organisation: existingUserByEmail.organisations || existingUserByEmail.organizations?.name,
        organization: existingUserByEmail.organizations,
        onboardingCompleted: existingUserByEmail.onboarding_completed,
      };

      return NextResponse.json(transformedUser);
    }

    // Create new user profile
    const now = new Date().toISOString();
    const newUser = {
      id,
      email,
      first_name: first_name || email.split('@')[0],
      last_name: last_name || '',
      avatar_url: avatar_url || null,
      role: 'public_user',
      auth_provider: 'google',
      onboarding_completed: false,
      last_login: now,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('users')
      .insert(newUser)
      .select()
      .single();

    if (error) {
      console.error('[OAuth User] Error creating user:', error.code, error.message);
      
      if (error.code === '23505') {
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .or(`id.eq.${id},email.eq.${email}`)
          .single();
        
        if (existingUser) {
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
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    notifySuperUsersOfNewRegistration({
      userId: data.id,
      email: data.email,
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email,
      registrationMethod: 'google',
      registeredAt: now,
    }).catch((err) => {
      console.error('[OAuth User] Failed to send super user notification:', err);
    });

    const transformedUser = {
      ...data,
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || email,
      firstName: data.first_name,
      lastName: data.last_name,
      profilePicture: data.avatar_url,
      lastLogin: data.last_login,
      authProvider: data.auth_provider || 'google',
      onboardingCompleted: data.onboarding_completed,
    };

    return NextResponse.json(transformedUser, { status: 201 });

  } catch (error) {
    console.error('[OAuth User] Unexpected error:', error instanceof Error ? error.message : String(error));
    
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
