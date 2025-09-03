import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('[Create Description Columns] Adding new description type columns...');
    
    const supabase = getSupabaseAdmin();
    
    // Try to add the columns one by one using ALTER TABLE
    const columns = [
      {
        name: 'description_objectives',
        sql: 'ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_objectives TEXT NULL;'
      },
      {
        name: 'description_target_groups', 
        sql: 'ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_target_groups TEXT NULL;'
      },
      {
        name: 'description_other',
        sql: 'ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_other TEXT NULL;'
      }
    ];
    
    const results = [];
    
    for (const column of columns) {
      try {
        // Use raw SQL via rpc if available, otherwise try direct query
        const { data, error } = await supabase.rpc('exec_sql', { 
          query: column.sql 
        }).catch(() => ({ data: null, error: { message: 'RPC not available, trying direct approach' } }));
        
        if (error && error.message.includes('RPC not available')) {
          // Try alternative approach - direct SQL execution
          console.log(`[Create Description Columns] Trying alternative approach for ${column.name}`);
          
          // We can't directly execute DDL through the Supabase client
          // But we can check if the column exists by querying it
          const { data: testData, error: testError } = await supabase
            .from('activities')
            .select(column.name.replace('description_', ''))
            .limit(1);
            
          results.push({
            column: column.name,
            status: testError ? 'needs_manual_creation' : 'exists',
            error: testError?.message
          });
        } else if (error) {
          results.push({
            column: column.name,
            status: 'error',
            error: error.message
          });
        } else {
          results.push({
            column: column.name,
            status: 'created',
            error: null
          });
        }
      } catch (err) {
        results.push({
          column: column.name,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }
    
    console.log('[Create Description Columns] Results:', results);
    
    // Check if all columns were created successfully
    const needsManualCreation = results.some(r => r.status === 'needs_manual_creation');
    const hasErrors = results.some(r => r.status === 'error');
    
    if (needsManualCreation) {
      return NextResponse.json({
        success: false,
        message: 'Database columns need to be created manually',
        sqlToRun: [
          'ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_objectives TEXT NULL;',
          'ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_target_groups TEXT NULL;', 
          'ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_other TEXT NULL;'
        ],
        results
      });
    }
    
    if (hasErrors) {
      return NextResponse.json({
        success: false,
        message: 'Some columns could not be created',
        results
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'All description type columns created successfully',
      results
    });
    
  } catch (error) {
    console.error('[Create Description Columns] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error during column creation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}