import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  console.log('[AIMS] PUT /api/users/change-email-simple - Starting request');
  
  const { supabase: authSupabase, response } = await requireAuth();
  if (response) return response;
  
  try {
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

    // Use authenticated supabase client
    if (!authSupabase) {
      console.error('[AIMS] No database client available');
      return NextResponse.json(
        { 
          error: 'Email change is currently unavailable',
          details: 'Database configuration is missing.'
        },
        { status: 503 }
      );
    }
    
    // Check if the new email is already in use
    const { data: existingUser, error: existingUserError } = await authSupabase
      .from('users')
      .select('id')
      .eq('email', newEmail)
      .maybeSingle();
    
    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json(
        { error: 'Email address is already in use by another user' },
        { status: 400 }
      );
    }
    
    // Get the current user profile to verify existence
    const { data: userProfile, error: profileError } = await authSupabase
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

    // Update the user profile in the database
    const { data: updatedProfile, error: profileUpdateError } = await authSupabase
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
        { error: 'Failed to update user email: ' + profileUpdateError.message },
        { status: 400 }
      );
    }

    console.log('[AIMS] Email updated successfully in database for user:', userId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email address updated successfully',
      user: updatedProfile,
      note: 'Email updated in database. User should use new email for login.'
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
