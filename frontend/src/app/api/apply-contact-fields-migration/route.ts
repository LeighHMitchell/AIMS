import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST() {
  console.log('[Contact Fields Migration] Starting migration');
  
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    
    // Apply the contact fields migration SQL
    const migrationSQL = `
      -- Add new contact fields to users table
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS contact_type TEXT,
      ADD COLUMN IF NOT EXISTS secondary_email TEXT,
      ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
      ADD COLUMN IF NOT EXISTS fax_number TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT;

      -- Add constraints for email format
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'check_secondary_email_format'
        ) THEN
          ALTER TABLE users
          ADD CONSTRAINT check_secondary_email_format 
          CHECK (secondary_email IS NULL OR secondary_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');
        END IF;
      END $$;

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_users_contact_type ON users(contact_type);
      CREATE INDEX IF NOT EXISTS idx_users_secondary_email ON users(secondary_email);
    `;
    
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('[Contact Fields Migration] RPC error:', error);
      
      // Try executing each statement individually
      const statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_type TEXT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_email TEXT;", 
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_phone TEXT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS fax_number TEXT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;",
        "CREATE INDEX IF NOT EXISTS idx_users_contact_type ON users(contact_type);",
        "CREATE INDEX IF NOT EXISTS idx_users_secondary_email ON users(secondary_email);"
      ];
      
      const results = [];
      for (const statement of statements) {
        try {
          console.log(`[Contact Fields Migration] Executing: ${statement}`);
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (stmtError) {
            console.warn(`[Contact Fields Migration] Warning: ${stmtError.message}`);
            results.push({ statement, status: 'warning', message: stmtError.message });
          } else {
            console.log(`[Contact Fields Migration] Success: ${statement}`);
            results.push({ statement, status: 'success' });
          }
        } catch (err) {
          console.error(`[Contact Fields Migration] Error: ${err}`);
          results.push({ statement, status: 'error', error: err });
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Contact fields migration attempted',
        results
      });
    }
    
    console.log('[Contact Fields Migration] Migration completed successfully');
    
    // Verify the new columns exist
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'users')
      .eq('table_schema', 'public')
      .in('column_name', ['contact_type', 'secondary_email', 'secondary_phone', 'fax_number', 'notes']);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Contact fields migration completed successfully',
      columns: columns?.map((c: any) => c.column_name) || []
    });
    
  } catch (error) {
    console.error('[Contact Fields Migration] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
