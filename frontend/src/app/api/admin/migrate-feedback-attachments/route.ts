import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('[Feedback Migration] Starting migration to add attachment columns');

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Execute the migration SQL directly
    console.log('[Feedback Migration] Executing migration SQL...');
    
    const migrationQueries = [
      'ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS attachment_url TEXT;',
      'ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS attachment_filename VARCHAR(255);',
      'ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50);',
      'ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS attachment_size INTEGER;',
      'CREATE INDEX IF NOT EXISTS idx_feedback_has_attachment ON public.feedback(attachment_url) WHERE attachment_url IS NOT NULL;'
    ];

    let error = null;
    for (const query of migrationQueries) {
      console.log('[Feedback Migration] Executing:', query);
      const { error: queryError } = await supabase.rpc('exec_sql', { query });
      if (queryError) {
        console.error('[Feedback Migration] Query failed:', query, queryError);
        error = queryError;
        break;
      }
    }

    if (error) {
      console.error('[Feedback Migration] Migration failed:', error);
      return NextResponse.json({ 
        error: 'Migration failed', 
        details: error.message 
      }, { status: 500 });
    }

    // Verify the columns were added
    const { data: columns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'feedback')
      .eq('table_schema', 'public')
      .in('column_name', ['attachment_url', 'attachment_filename', 'attachment_type', 'attachment_size']);

    if (verifyError) {
      console.error('[Feedback Migration] Verification failed:', verifyError);
      return NextResponse.json({ 
        error: 'Migration verification failed', 
        details: verifyError.message 
      }, { status: 500 });
    }

    console.log('[Feedback Migration] Migration completed successfully');
    console.log('[Feedback Migration] Added columns:', columns);

    return NextResponse.json({ 
      success: true, 
      message: 'Feedback attachment columns added successfully',
      columns: columns
    });

  } catch (error) {
    console.error('[Feedback Migration] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during migration' 
    }, { status: 500 });
  }
}
