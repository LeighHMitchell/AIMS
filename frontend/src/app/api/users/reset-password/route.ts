import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Force dynamic rendering to ensure environment variables are always loaded
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[AIMS] POST /api/users/reset-password - Starting request');
  
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
    const { userId, newPassword } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }
    
    // First, verify the user exists in our users table
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
    
    // Try to get the auth user to verify they exist
    const { data: authUser, error: authGetError } = await supabase.auth.admin.getUserById(userId);
    
    if (authGetError || !authUser) {
      console.error('[AIMS] Auth user not found:', authGetError);
      // If auth user doesn't exist, we need to create one
      console.log('[AIMS] Creating auth user for existing profile:', userProfile.email);
      
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email: userProfile.email,
        password: newPassword,
        email_confirm: true,
      });
      
      if (createError) {
        console.error('[AIMS] Error creating auth user:', createError);
        return NextResponse.json(
          { error: 'Failed to create auth user: ' + createError.message },
          { status: 400 }
        );
      }
      
      // Update the profile with the new auth user ID if different
      if (newAuthUser.user.id !== userId) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ id: newAuthUser.user.id })
          .eq('id', userId);
        
        if (updateError) {
          console.error('[AIMS] Error updating profile with new auth ID:', updateError);
        }
      }
      
      console.log('[AIMS] Auth user created and password set for:', userProfile.email);
      return NextResponse.json({ 
        success: true, 
        message: 'Auth user created and password set successfully',
        user: newAuthUser.user 
      });
    }
    
    // Reset the user's password using Supabase Admin API
    console.log('[AIMS] Attempting to reset password for userId:', userId);
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });
    
    if (error) {
      console.error('[AIMS] Error resetting password:', error);
      console.error('[AIMS] Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: error.message || 'Failed to reset password' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS] Password reset successfully for user:', userId);
    return NextResponse.json({ 
      success: true, 
      message: 'Password reset successfully',
      user: data.user 
    });
    
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
