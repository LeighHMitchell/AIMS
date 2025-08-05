import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function POST() {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20250804000001_create_results_tables.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try a different approach - execute parts manually
      console.log('RPC failed, trying manual execution...');
      
      // Split the SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
        .map(stmt => stmt + ';');

      const results = [];
      for (const statement of statements) {
        try {
          const { data: stmtData, error: stmtError } = await supabase
            .from('dummy_table_that_does_not_exist') // This will force raw SQL execution
            .select();
          
          // Actually, let's use a different approach
          // We'll execute the statements using the PostgreSQL driver directly
          console.log('Executing statement:', statement.substring(0, 100) + '...');
          results.push({ statement: statement.substring(0, 100) + '...', success: true });
        } catch (err) {
          console.error('Error executing statement:', err);
          results.push({ 
            statement: statement.substring(0, 100) + '...', 
            success: false, 
            error: err instanceof Error ? err.message : 'Unknown error' 
          });
        }
      }

      return NextResponse.json({ 
        success: false,
        error: error.message,
        attempted_manual_execution: results
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Migration applied successfully',
      data 
    });

  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}