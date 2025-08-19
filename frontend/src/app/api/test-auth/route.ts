import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('[TEST] Testing Supabase Auth configuration');
  
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({
        error: 'Supabase admin client is not configured',
        details: 'Missing environment variables'
      }, { status: 500 });
    }

    // Test 1: Check if we can list users
    console.log('[TEST] Test 1: Listing users...');
    const { data: users, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

    if (listError) {
      console.error('[TEST] Error listing users:', listError);
      return NextResponse.json({
        error: 'Failed to list users',
        details: listError.message,
        test: 'listUsers'
      }, { status: 500 });
    }

    console.log('[TEST] Successfully listed users');

    // Test 2: Check if email changes are enabled
    const testUserId = request.nextUrl.searchParams.get('userId');
    if (testUserId) {
      console.log('[TEST] Test 2: Checking user by ID:', testUserId);
      
      const { data: userCheck, error: userError } = await supabase.auth.admin.getUserById(testUserId);
      
      if (userError) {
        console.error('[TEST] Error getting user:', userError);
        return NextResponse.json({
          error: 'Failed to get user',
          details: userError.message,
          userId: testUserId,
          test: 'getUserById'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Auth configuration is working',
        user: {
          id: userCheck.user.id,
          email: userCheck.user.email,
          email_confirmed_at: userCheck.user.email_confirmed_at,
          created_at: userCheck.user.created_at
        },
        authEnabled: true
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase Auth is configured correctly',
      canListUsers: true,
      userCount: users?.length || 0
    });

  } catch (error) {
    console.error('[TEST] Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error testing auth',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
