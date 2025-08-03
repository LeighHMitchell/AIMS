import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    console.log('[Table Test] Testing comments tables...');

    // Test 1: Check if activity_comments table exists
    const { data: commentsTest, error: commentsError } = await supabase
      .from('activity_comments')
      .select('id')
      .limit(1);

    console.log('[Table Test] Comments table test:', { commentsTest, commentsError });

    // Test 2: Check if activity_comment_replies table exists  
    const { data: repliesTest, error: repliesError } = await supabase
      .from('activity_comment_replies')
      .select('id')
      .limit(1);

    console.log('[Table Test] Replies table test:', { repliesTest, repliesError });

    // Test 3: Check if activity_comment_likes table exists
    const { data: likesTest, error: likesError } = await supabase
      .from('activity_comment_likes')
      .select('id')
      .limit(1);

    console.log('[Table Test] Likes table test:', { likesTest, likesError });

    // Test 4: Try to get table info from information_schema
    const { data: tableInfo, error: tableInfoError } = await supabase
      .rpc('get_table_info', {});

    console.log('[Table Test] Table info RPC:', { tableInfo, tableInfoError });

    // Test 5: Simple query to see what we can access
    const { data: activitiesTest, error: activitiesError } = await supabase
      .from('activities')
      .select('id')
      .limit(1);

    console.log('[Table Test] Activities table test:', { activitiesTest, activitiesError });

    return NextResponse.json({
      tablesStatus: {
        activity_comments: {
          exists: !commentsError,
          error: commentsError?.message,
          errorCode: commentsError?.code
        },
        activity_comment_replies: {
          exists: !repliesError,
          error: repliesError?.message,
          errorCode: repliesError?.code
        },
        activity_comment_likes: {
          exists: !likesError,
          error: likesError?.message,
          errorCode: likesError?.code
        },
        activities: {
          exists: !activitiesError,
          error: activitiesError?.message,
          errorCode: activitiesError?.code
        }
      },
      message: 'Tables test completed'
    });

  } catch (error) {
    console.error('[Table Test] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}