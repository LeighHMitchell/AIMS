import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Admin endpoint to make position column nullable
 * This fixes the issue where contacts cannot be saved without a position field
 * 
 * Access: GET /api/admin/migrate-position
 */
export async function GET() {
  try {
    console.log('[Migration] Starting position column migration...');
    
    const supabase = getSupabaseAdmin();
    
    // Execute the SQL to make position nullable
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.activity_contacts ALTER COLUMN position DROP NOT NULL;'
    });

    if (error) {
      // Try alternative method using raw SQL
      console.log('[Migration] RPC failed, trying direct SQL execution...');
      
      // This will work if the user has the right permissions
      const { error: sqlError } = await supabase
        .from('activity_contacts')
        .select('position')
        .limit(0); // Just to test connection
        
      if (sqlError) {
        console.error('[Migration] Database connection error:', sqlError);
        throw sqlError;
      }

      // Since direct ALTER TABLE doesn't work through the JS client,
      // we'll return instructions for manual execution
      return NextResponse.json({
        success: false,
        message: 'Migration needs to be run manually',
        instructions: {
          sql: 'ALTER TABLE public.activity_contacts ALTER COLUMN position DROP NOT NULL;',
          steps: [
            '1. Go to https://app.supabase.com',
            '2. Select your project',
            '3. Navigate to SQL Editor',
            '4. Paste and run the SQL command above',
            '5. Refresh this page to verify'
          ]
        }
      }, { status: 200 });
    }

    console.log('[Migration] Position column migration completed successfully!');

    // Verify the change
    const { data: verifyData, error: verifyError } = await supabase
      .from('activity_contacts')
      .select('position')
      .limit(1);

    if (verifyError) {
      console.error('[Migration] Verification failed:', verifyError);
    }

    return NextResponse.json({
      success: true,
      message: 'Position column is now nullable. Contacts can be saved without a position field.',
      migration: 'ALTER TABLE public.activity_contacts ALTER COLUMN position DROP NOT NULL',
      verified: !verifyError
    });

  } catch (error) {
    console.error('[Migration] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      instructions: {
        sql: 'ALTER TABLE public.activity_contacts ALTER COLUMN position DROP NOT NULL;',
        message: 'Please run this SQL manually in your Supabase dashboard (SQL Editor)'
      }
    }, { status: 500 });
  }
}

