import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { notifySuperUsersOfNewRegistration } from '@/lib/notifications/user-registration-notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[Register] ========================================');
  console.log('[Register] POST /api/auth/register - Starting');
  console.log('[Register] Timestamp:', new Date().toISOString());

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[Register] ERROR: Supabase admin client is not configured');
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }
    console.log('[Register] Supabase admin client initialized');

    const body = await request.json();
    console.log('[Register] Request body (email only):', body.email);

    const { email, password, firstName, lastName } = body;

    // Validate required fields
    if (!email) {
      console.error('[Register] ERROR: Missing email');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!password) {
      console.error('[Register] ERROR: Missing password');
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      console.error('[Register] ERROR: Password too short');
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    console.log('[Register] Validated - Email:', email);

    // Check if user already exists in the users table
    console.log('[Register] Checking for existing user by email...');
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('[Register] Error checking for existing user:', checkError);
      // Don't block registration if the check fails - continue and let auth handle it
    }

    if (existingUser) {
      console.log('[Register] User already exists in users table with email:', email);
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    // Create auth user using Supabase Admin API
    // email_confirm: true means user is auto-confirmed and can sign in immediately
    // Set to false and configure SMTP if you want email verification
    console.log('[Register] Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm user so they can sign in immediately
      user_metadata: {
        first_name: firstName || email.split('@')[0],
        last_name: lastName || '',
      },
    });

    if (authError) {
      console.error('[Register] Error creating auth user:');
      console.error('[Register] Error code:', authError.code);
      console.error('[Register] Error message:', authError.message);

      // Handle specific error cases
      if (authError.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      console.error('[Register] No user returned from auth creation');
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    console.log('[Register] Auth user created:', authData.user.id);

    // Check if profile was already created by database trigger (handle_new_auth_user)
    // The trigger automatically creates a profile when an auth user is created
    console.log('[Register] Checking if profile was created by trigger...');
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    let profileData = existingProfile;
    const now = new Date().toISOString();

    if (existingProfile) {
      console.log('[Register] Profile already created by trigger, updating with registration data...');
      // Update the profile with the data from registration
      const { data: updatedProfile, error: updateError } = await supabase
        .from('users')
        .update({
          first_name: firstName || existingProfile.first_name || email.split('@')[0],
          last_name: lastName || existingProfile.last_name || '',
          role: 'public_user', // Ensure public_user role for self-registered users
          auth_provider: 'email',
          is_active: true,
          updated_at: now,
        })
        .eq('id', authData.user.id)
        .select()
        .single();

      if (updateError) {
        console.error('[Register] Error updating profile:', updateError);
        // Continue with existing profile data even if update fails
      } else {
        profileData = updatedProfile;
      }
    } else {
      // No profile created by trigger, create one manually
      console.log('[Register] Creating user profile manually...');
      const newUser = {
        id: authData.user.id,
        email,
        first_name: firstName || email.split('@')[0],
        last_name: lastName || '',
        role: 'public_user', // Default role for self-registered users (limited access)
        auth_provider: 'email', // Track that this user signed up via email/password
        is_active: true,
        created_at: now,
        updated_at: now,
      };

      console.log('[Register] New user data:', JSON.stringify({ ...newUser, id: '[REDACTED]' }, null, 2));

      const { data: createdProfile, error: profileError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (profileError) {
        console.error('[Register] ERROR creating user profile:');
        console.error('[Register] Error code:', profileError.code);
        console.error('[Register] Error message:', profileError.message);
        console.error('[Register] Error details:', profileError.details);

        // If profile creation fails, try to clean up the auth user
        console.log('[Register] Attempting to clean up auth user...');
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
          console.log('[Register] Auth user cleaned up successfully');
        } catch (cleanupError) {
          console.error('[Register] Failed to clean up auth user:', cleanupError);
        }

        // Check if it's a duplicate key error (race condition with trigger)
        if (profileError.code === '23505') {
          // Try to fetch the profile that was created
          const { data: raceProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (raceProfile) {
            profileData = raceProfile;
          } else {
            return NextResponse.json(
              { error: 'An account with this email already exists. Please sign in instead.' },
              { status: 409 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Failed to create user profile' },
            { status: 500 }
          );
        }
      } else {
        profileData = createdProfile;
      }
    }

    if (!profileData) {
      console.error('[Register] No profile data available');
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    console.log('[Register] SUCCESS - User created:', profileData.email);
    console.log('[Register] User ID:', profileData.id);

    // Notify super users of new registration (fire and forget - don't block registration)
    notifySuperUsersOfNewRegistration({
      userId: profileData.id,
      email: profileData.email,
      name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || profileData.email,
      registrationMethod: 'email',
      registeredAt: now,
    }).catch((err) => {
      console.error('[Register] Failed to send super user notification:', err);
    });

    // Transform to match frontend expectations
    const transformedUser = {
      ...profileData,
      name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || email,
      firstName: profileData.first_name,
      lastName: profileData.last_name,
      profilePicture: profileData.avatar_url,
      authProvider: profileData.auth_provider || 'email',
      isActive: profileData.is_active,
      createdAt: profileData.created_at,
      updatedAt: profileData.updated_at,
    };

    console.log('[Register] ========================================');

    return NextResponse.json({
      user: transformedUser,
      message: 'Account created successfully. Please check your email to verify your account.',
      emailVerificationRequired: true,
    }, { status: 201 });

  } catch (error) {
    console.error('[Register] ========================================');
    console.error('[Register] UNEXPECTED ERROR:', error);
    console.error('[Register] Error type:', typeof error);
    console.error('[Register] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[Register] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[Register] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('[Register] ========================================');

    return NextResponse.json(
      { error: 'Failed to create account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
