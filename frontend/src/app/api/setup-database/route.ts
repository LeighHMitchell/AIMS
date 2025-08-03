import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const results: string[] = [];

    // Check activity_comments table
    try {
      const { data, error } = await supabase
        .from('activity_comments')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        results.push('❌ activity_comments table does not exist');
      } else if (error) {
        results.push(`❌ activity_comments: ${error.message}`);
      } else {
        results.push('✅ activity_comments table exists');
      }
    } catch (err) {
      results.push(`❌ activity_comments: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Check activity_comment_replies table
    try {
      const { data, error } = await supabase
        .from('activity_comment_replies')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        results.push('❌ activity_comment_replies table does not exist');
      } else if (error) {
        results.push(`❌ activity_comment_replies: ${error.message}`);
      } else {
        results.push('✅ activity_comment_replies table exists');
      }
    } catch (err) {
      results.push(`❌ activity_comment_replies: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Check activity_comment_likes table
    try {
      const { data, error } = await supabase
        .from('activity_comment_likes')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        results.push('❌ activity_comment_likes table does not exist');
      } else if (error) {
        results.push(`❌ activity_comment_likes: ${error.message}`);
      } else {
        results.push('✅ activity_comment_likes table exists');
      }
    } catch (err) {
      results.push(`❌ activity_comment_likes: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Test the main activity table
    const { data: testActivity, error: testError } = await supabase
      .from('activities')
      .select('id, title_narrative')
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Database check completed',
      results,
      instructions: [
        'Tables marked with ❌ need to be created manually.',
        'Copy the SQL from setup-comments-tables.sql and run it in your database.',
        'Or run the SQL script in your Supabase SQL editor.'
      ],
      test: {
        activityFound: !!testActivity,
        activityError: testError?.message || null,
        sampleActivity: testActivity ? {
          id: testActivity.id,
          title: testActivity.title_narrative
        } : null
      }
    });

  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Database check failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}