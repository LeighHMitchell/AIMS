import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[AIMS] POST /api/users/delete-account - Starting request');
  
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userId, confirmEmail } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!confirmEmail) {
      return NextResponse.json(
        { error: 'Email confirmation is required' },
        { status: 400 }
      );
    }

    // Fetch the user to verify they exist and check their role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, first_name, last_name')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('[AIMS] Error fetching user:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify the email matches
    if (userData.email.toLowerCase() !== confirmEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email confirmation does not match' },
        { status: 400 }
      );
    }

    // Check if user is an admin/super_user - they cannot delete themselves
    if (userData.role === 'super_user' || userData.role === 'admin') {
      return NextResponse.json(
        { 
          error: 'Admin accounts cannot be self-deleted',
          message: 'Admin accounts must be deleted by another administrator from Admin > Users'
        },
        { status: 403 }
      );
    }

    console.log('[AIMS] Starting account deletion for user:', userData.email);

    // Step 1: Anonymize organization comments
    const { error: anonymizeCommentsError } = await supabase
      .from('organization_comments')
      .update({ 
        user_name: 'Deleted User',
        // Keep user_id for reference but the display name is anonymized
      })
      .eq('user_id', userId);

    if (anonymizeCommentsError) {
      console.error('[AIMS] Error anonymizing organization comments:', anonymizeCommentsError);
      // Continue with deletion - this is not critical
    } else {
      console.log('[AIMS] Anonymized organization comments');
    }

    // Step 2: Clear focal point assignments (set linked_user_id to null)
    const { error: clearFocalPointsError } = await supabase
      .from('activity_contacts')
      .update({ 
        linked_user_id: null,
        // Keep the contact record but unlink from user
      })
      .eq('linked_user_id', userId);

    if (clearFocalPointsError) {
      console.error('[AIMS] Error clearing focal point assignments:', clearFocalPointsError);
      // Continue with deletion - this is not critical
    } else {
      console.log('[AIMS] Cleared focal point assignments');
    }

    // Step 3: Delete from public.users table
    // This will cascade delete:
    // - activity_bookmarks (ON DELETE CASCADE)
    // - user_notifications (ON DELETE CASCADE)
    // - feedback (ON DELETE CASCADE)
    // And set to NULL:
    // - Various created_by/updated_by fields (ON DELETE SET NULL)
    const { error: deleteProfileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      console.error('[AIMS] Error deleting user profile:', deleteProfileError);
      return NextResponse.json(
        { error: 'Failed to delete user profile: ' + deleteProfileError.message },
        { status: 500 }
      );
    }

    console.log('[AIMS] Deleted user from public.users');

    // Step 4: Delete from auth.users
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('[AIMS] Error deleting auth user:', authDeleteError);
      // Profile already deleted, log the error but return success
      // The auth user will be orphaned but won't be able to access anything
    } else {
      console.log('[AIMS] Deleted user from auth.users');
    }

    console.log('[AIMS] Successfully deleted account for:', userData.email);

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
      deletedEmail: userData.email,
    });
    
  } catch (error) {
    console.error('[AIMS] Unexpected error during account deletion:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}

