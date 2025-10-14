import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * One-time migration endpoint to make position column nullable
 * Access this endpoint once to apply the migration
 * 
 * Usage: Navigate to /api/run-migration in your browser
 */
export async function GET() {
  try {
    console.log('[Migration] Attempting to make position column nullable...');
    
    const supabase = getSupabaseAdmin();
    
    // Use raw SQL query through Supabase
    const { data, error } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE public.activity_contacts ALTER COLUMN position DROP NOT NULL;'
    });

    if (error) {
      console.error('[Migration] RPC exec_sql failed:', error);
      
      // Try using a different approach - create a temporary function
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION run_migration_make_position_nullable()
        RETURNS void AS $$
        BEGIN
          ALTER TABLE public.activity_contacts ALTER COLUMN position DROP NOT NULL;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      const { error: createError } = await (supabase as any).rpc('exec_sql', {
        query: createFunctionSQL
      });
      
      if (createError) {
        console.error('[Migration] Failed to create migration function:', createError);
        
        // Return manual instructions
        return NextResponse.json({
          success: false,
          needsManualExecution: true,
          sql: 'ALTER TABLE public.activity_contacts ALTER COLUMN position DROP NOT NULL;',
          instructions: [
            '1. Open Supabase Dashboard: https://app.supabase.com',
            '2. Go to SQL Editor',
            '3. Run: ALTER TABLE public.activity_contacts ALTER COLUMN position DROP NOT NULL;',
            '4. Then try saving a contact again'
          ]
        }, { status: 200 });
      }
      
      // Execute the migration function
      const { error: execError } = await supabase.rpc('run_migration_make_position_nullable');
      
      if (execError) {
        console.error('[Migration] Failed to execute migration function:', execError);
        throw execError;
      }
    }

    console.log('[Migration] Successfully made position column nullable!');

    return NextResponse.json({
      success: true,
      message: 'Position column is now nullable. You can now save contacts without a position field!',
      nextSteps: [
        'Go back to your activity editor',
        'Try adding a contact',
        'It should now save successfully'
      ]
    });

  } catch (error) {
    console.error('[Migration] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      needsManualExecution: true,
      sql: 'ALTER TABLE public.activity_contacts ALTER COLUMN position DROP NOT NULL;',
      instructions: [
        '1. Open Supabase Dashboard: https://app.supabase.com',
        '2. Go to SQL Editor',
        '3. Run the SQL command above',
        '4. Then try saving a contact again'
      ]
    }, { status: 500 });
  }
}

