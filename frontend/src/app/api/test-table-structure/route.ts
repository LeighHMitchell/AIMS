import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    console.log('[Structure Test] Checking table structure...');

    // Test insert to see what columns are expected
    const { data: insertTest, error: insertError } = await supabase
      .from('activity_comments')
      .insert({
        activity_id: '23456789-abcd-ef01-2345-6789abcdef03',
        user_id: '85a65398-5d71-4633-a50b-2f167a0b6f7a',
        user_name: 'Test User',
        user_role: 'super_user',
        content: 'Test with content column', // Try with content
        type: 'Feedback'
      })
      .select()
      .single();

    console.log('[Structure Test] Insert with content column:', { insertTest, insertError });

    if (insertError) {
      // Try with message column
      const { data: insertTest2, error: insertError2 } = await supabase
        .from('activity_comments')
        .insert({
          activity_id: '23456789-abcd-ef01-2345-6789abcdef03',
          user_id: '85a65398-5d71-4633-a50b-2f167a0b6f7a',
          user_name: 'Test User',
          user_role: 'super_user',
          message: 'Test with message column', // Try with message
          type: 'Feedback'
        })
        .select()
        .single();

      console.log('[Structure Test] Insert with message column:', { insertTest2, insertError2 });
      
      return NextResponse.json({
        contentColumnTest: {
          success: false,
          error: insertError.message,
          errorCode: insertError.code
        },
        messageColumnTest: {
          success: !insertError2,
          error: insertError2?.message,
          errorCode: insertError2?.code,
          data: insertTest2
        }
      });
    }

    return NextResponse.json({
      contentColumnTest: {
        success: true,
        data: insertTest
      },
      messageColumnTest: {
        success: false,
        error: 'Did not test - content column worked'
      }
    });

  } catch (error) {
    console.error('[Structure Test] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}