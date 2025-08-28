import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('[Debug Feedback Attachments] Checking database for attachment data');

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Try to get a single feedback record to check what columns exist
    const { data: sampleFeedback, error: sampleError } = await supabase
      .from('feedback')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('[Debug] Error checking feedback table:', sampleError);
      return NextResponse.json({ error: 'Failed to check feedback table' }, { status: 500 });
    }

    // Check if attachment columns exist by looking at the sample data
    const hasAttachmentColumns = sampleFeedback && sampleFeedback.length > 0 && 
      'attachment_url' in sampleFeedback[0] && 
      'attachment_filename' in sampleFeedback[0] && 
      'attachment_type' in sampleFeedback[0] && 
      'attachment_size' in sampleFeedback[0];

    console.log('[Debug] Sample feedback record:', sampleFeedback?.[0]);
    console.log('[Debug] Has attachment columns:', hasAttachmentColumns);

    // Get recent feedback with attachments
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .select(`
        id,
        subject,
        message,
        attachment_url,
        attachment_filename,
        attachment_type,
        attachment_size,
        created_at
      `)
      .not('attachment_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (feedbackError) {
      console.error('[Debug] Error fetching feedback:', feedbackError);
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
    }

    // Get all recent feedback (including those without attachments)
    const { data: allFeedback, error: allFeedbackError } = await supabase
      .from('feedback')
      .select(`
        id,
        subject,
        message,
        attachment_url,
        attachment_filename,
        attachment_type,
        attachment_size,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (allFeedbackError) {
      console.error('[Debug] Error fetching all feedback:', allFeedbackError);
      return NextResponse.json({ error: 'Failed to fetch all feedback' }, { status: 500 });
    }

    console.log('[Debug] Feedback with attachments:', feedback?.length || 0);
    console.log('[Debug] Total recent feedback:', allFeedback?.length || 0);

    return NextResponse.json({
      success: true,
      hasAttachmentColumns,
      feedbackWithAttachments: feedback || [],
      allRecentFeedback: allFeedback || [],
      summary: {
        totalFeedback: allFeedback?.length || 0,
        feedbackWithAttachments: feedback?.length || 0,
        hasAttachmentColumns
      }
    });

  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during debug check' 
    }, { status: 500 });
  }
}
