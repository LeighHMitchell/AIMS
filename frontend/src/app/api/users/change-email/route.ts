import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  console.log('[AIMS] PUT /api/users/change-email - Starting request');
  
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userId, newEmail, currentUserRole } = body;
    
    console.log('[AIMS] Email change request:', { userId, newEmail, currentUserRole });
    
    if (!userId || !newEmail || !currentUserRole) {
      return NextResponse.json(
        { error: 'User ID, new email, and current user role are required' },
        { status: 400 }
      );
    }

    // Only super users can change emails
    if (currentUserRole !== 'super_user') {
      return NextResponse.json(
        { error: 'Only super users can change email addresses' },
        { status: 403 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Check if the new email is already in use
    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', newEmail)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no match
    
    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json(
        { error: 'Email address is already in use by another user' },
        { status: 400 }
      );
    }
    
    // Get the current user profile to verify existence
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single();
    
    if (profileError || !userProfile) {
      console.error('[AIMS] User profile not found:', profileError);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    console.log('[AIMS] Found user profile:', userProfile.first_name, userProfile.last_name);
    console.log('[AIMS] Changing email from', userProfile.email, 'to', newEmail, 'for user', userId);

    // Check if this user exists in Supabase Auth by trying to get user by ID first
    const { data: authUserCheck, error: authUserCheckError } = await supabase.auth.admin.getUserById(userId);
    
    if (authUserCheckError || !authUserCheck.user) {
      console.log('[AIMS] User not found in Auth, this might be a database-only user');
      console.log('[AIMS] Auth error:', authUserCheckError?.message);
      
      // If user doesn't exist in Auth, just update the database
      const { data: updatedProfile, error: profileUpdateError } = await supabase
        .from('users')
        .update({ 
          email: newEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (profileUpdateError) {
        console.error('[AIMS] Error updating user profile email:', profileUpdateError);
        return NextResponse.json(
          { error: 'Failed to update user profile email: ' + profileUpdateError.message },
          { status: 400 }
        );
      }

      console.log('[AIMS] Email updated successfully in database for user:', userId);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Email address updated successfully (database only)',
        user: updatedProfile
      });
    }

    // User exists in Auth, proceed with full update
    console.log('[AIMS] User found in Auth, proceeding with full update');
    
    // Update the Supabase Auth user
    const { data: authUser, error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true // Automatically confirm the new email for admin changes
    });
    
    if (authUpdateError) {
      console.error('[AIMS] Error updating auth user email:', authUpdateError);
      return NextResponse.json(
        { error: 'Failed to update authentication email: ' + authUpdateError.message },
        { status: 400 }
      );
    }

    // Then, update the user profile in the database
    const { data: updatedProfile, error: profileUpdateError } = await supabase
      .from('users')
      .update({ 
        email: newEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (profileUpdateError) {
      console.error('[AIMS] Error updating user profile email:', profileUpdateError);
      
      // Try to rollback the auth email change
      try {
        await supabase.auth.admin.updateUserById(userId, {
          email: userProfile.email
        });
      } catch (rollbackError) {
        console.error('[AIMS] Failed to rollback auth email change:', rollbackError);
      }
      
      return NextResponse.json(
        { error: 'Failed to update user profile email: ' + profileUpdateError.message },
        { status: 400 }
      );
    }

    console.log('[AIMS] Email changed successfully for user:', userId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email address updated successfully',
      user: updatedProfile,
      authUser: authUser.user
    });
    
  } catch (error) {
    console.error('[AIMS] Unexpected error during email change:', error);
    return NextResponse.json(
      { error: 'Failed to change email address: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
