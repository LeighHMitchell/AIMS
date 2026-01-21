import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to initialize Supabase client' },
        { status: 500 }
      );
    }

    // 1. Find all users with local filesystem avatar URLs
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, avatar_url')
      .like('avatar_url', '/uploads/profiles/%');

    if (fetchError) {
      return NextResponse.json(
        { error: `Database fetch error: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        message: 'No users found with local avatar URLs',
        processed: 0,
        fixed: 0,
        failed: 0
      });
    }

    // 2. Update each user to remove broken avatar URL
    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const user of users) {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
      
      try {
        // Remove the broken avatar URL
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            avatar_url: null,
            updated_at: new Date().toISOString() 
          })
          .eq('id', user.id);

        if (updateError) {
          throw new Error(`Update error: ${updateError.message}`);
        }

        results.push({
          user: name,
          oldUrl: user.avatar_url,
          status: 'fixed'
        });
        successCount++;
      } catch (error: any) {
        results.push({
          user: name,
          oldUrl: user.avatar_url,
          status: 'failed',
          error: error.message
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      message: 'Avatar URL fix completed',
      processed: users.length,
      fixed: successCount,
      failed: errorCount,
      results
    });

  } catch (error: any) {
    console.error('Fix avatar URLs error:', error);
    return NextResponse.json(
      { error: 'Failed to fix avatar URLs', details: error.message },
      { status: 500 }
    );
  }
}

// GET method to check status
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to initialize Supabase client' },
        { status: 500 }
      );
    }

    // Count users with broken avatar URLs
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .like('avatar_url', '/uploads/profiles/%');

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      usersWithBrokenAvatars: count || 0,
      message: count > 0 
        ? `Found ${count} users with broken avatar URLs. Call POST with ?secret=your-secret to fix them.`
        : 'No users found with broken avatar URLs.'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to check avatar URLs', details: error.message },
      { status: 500 }
    );
  }
}
