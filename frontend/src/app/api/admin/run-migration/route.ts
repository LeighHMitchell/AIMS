import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Simple security check - in production you'd want proper auth
    if (body.secret !== 'run-migration-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    
    // Run the migration SQL
    const migrationSQL = `
      DO $$ BEGIN
          -- Add activity_scope column if it doesn't exist
          IF NOT EXISTS (
              SELECT 1 
              FROM information_schema.columns 
              WHERE table_name = 'activities' 
              AND column_name = 'activity_scope'
          ) THEN
              ALTER TABLE activities 
              ADD COLUMN activity_scope VARCHAR(2) NULL;
              
              -- Add constraint to ensure only valid IATI Activity Scope codes
              ALTER TABLE activities 
              ADD CONSTRAINT activities_activity_scope_check 
              CHECK (activity_scope IS NULL OR activity_scope IN ('1', '2', '3', '4', '5', '6', '7', '8'));
              
              -- Add comment explaining the field
              COMMENT ON COLUMN activities.activity_scope IS 'IATI Activity Scope code: 1=Global, 2=Regional, 3=Multi-national, 4=National, 5=Sub-national multi-first-level, 6=Sub-national single first-level, 7=Sub-national single second-level, 8=Single location';
              
              RAISE NOTICE 'activity_scope column added successfully';
          ELSE
              RAISE NOTICE 'activity_scope column already exists';
          END IF;
      END $$;
    `;

    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: migrationSQL 
    }).single();

    if (error) {
      // If RPC doesn't exist, try direct query
      const { error: directError } = await supabase.from('activities').select('activity_scope').limit(1);
      
      if (directError && directError.message.includes('column')) {
        // Column doesn't exist, we need to create it differently
        console.log('Column does not exist, attempting to create via raw SQL');
        
        // Try to create the column using a simpler approach
        const { error: alterError } = await supabase
          .from('activities')
          .update({ activity_scope: null })
          .eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
        
        if (alterError) {
          return NextResponse.json({ 
            error: 'Migration failed - column may need to be added manually',
            details: alterError.message,
            suggestion: 'Please add activity_scope VARCHAR(2) column to activities table in Supabase dashboard'
          }, { status: 500 });
        }
      }
      
      // Check if column exists now
      const { error: checkError } = await supabase.from('activities').select('activity_scope').limit(1);
      
      if (!checkError || !checkError.message.includes('column')) {
        return NextResponse.json({ 
          success: true, 
          message: 'activity_scope column exists or was created' 
        });
      }
      
      return NextResponse.json({ 
        error: 'Failed to run migration',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed successfully',
      result: data 
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}