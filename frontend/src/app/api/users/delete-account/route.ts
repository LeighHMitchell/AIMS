import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function POST(request: NextRequest) {
  console.log('[AIMS] POST /api/users/delete-account - Starting request');

  const { supabase, user: authUser, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase || !authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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

    // SECURITY: Validate user ID format
    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // SECURITY: Users can only delete their own account via this endpoint
    // This prevents IDOR attacks where an attacker provides another user's ID
    if (userId !== authUser.id) {
      console.warn(`[AIMS] IDOR attempt blocked: User ${authUser.id} tried to delete account ${userId}`);
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own account' },
        { status: 403 }
      );
    }

    if (!confirmEmail) {
      return NextResponse.json(
        { error: 'Email confirmation is required' },
        { status: 400 }
      );
    }

    // Fetch the user to verify they exist and check their role
    // SECURITY: Using authUser.id (verified from session) not userId from request
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, first_name, last_name')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      console.error('[AIMS] Error fetching user:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify the email matches (additional confirmation)
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

    // Use authUser.id consistently for all operations
    const targetUserId = authUser.id;

    // Step 1: Anonymize organization comments
    const { error: anonymizeCommentsError } = await supabase
      .from('organization_comments')
      .update({
        user_name: 'Deleted User',
      })
      .eq('user_id', targetUserId);

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
      })
      .eq('linked_user_id', targetUserId);

    if (clearFocalPointsError) {
      console.error('[AIMS] Error clearing focal point assignments:', clearFocalPointsError);
      // Continue with deletion - this is not critical
    } else {
      console.log('[AIMS] Cleared focal point assignments');
    }

    // Step 3: Clean up activity_logs to avoid FK constraint violation
    const { error: activityLogsError } = await supabase
      .from('activity_logs')
      .update({ user_id: null })
      .eq('user_id', targetUserId);

    if (activityLogsError) {
      console.error('[AIMS] Error cleaning up activity_logs:', activityLogsError);
      // Continue with deletion - this is not critical
    } else {
      console.log('[AIMS] Cleaned up activity_logs');
    }

    // Step 4: Delete from public.users table
    const { error: deleteProfileError } = await supabase
      .from('users')
      .delete()
      .eq('id', targetUserId);

    if (deleteProfileError) {
      console.error('[AIMS] Error deleting user profile:', deleteProfileError);
      return NextResponse.json(
        { error: 'Failed to delete user profile: ' + deleteProfileError.message },
        { status: 500 }
      );
    }

    console.log('[AIMS] Deleted user from public.users');

    // Step 5: Delete from auth.users
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(targetUserId);

    if (authDeleteError) {
      console.error('[AIMS] Error deleting auth user:', authDeleteError);
      // Profile already deleted, log the error but return success
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
