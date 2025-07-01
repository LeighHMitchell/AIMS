import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST() {
  console.log('[Migration] Starting updated_by column migration');
  
  try {
    const supabase = getSupabaseAdmin();
    
    // Run the migration SQL
    const migrationSQL = `
      -- Add updated_by column to organizations table
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

      -- Add updated_at timestamp if it doesn't exist  
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

      -- Create or replace function to automatically update the updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Create trigger to automatically update updated_at on row update
      DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
      CREATE TRIGGER update_organizations_updated_at 
      BEFORE UPDATE ON organizations 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `;
    
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL }).single();
    
    if (error) {
      console.error('[Migration] Error running migration:', error);
      
      // Try running the migration directly
      const { error: directError } = await supabase.from('organizations').select('updated_by').limit(1);
      
      if (directError && directError.code === '42703') {
        // Column doesn't exist, let's try a simpler approach
        console.log('[Migration] Trying direct column addition...');
        
        // Just add the column
        const addColumnSQL = `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_by UUID;`;
        
        return NextResponse.json({
          error: 'Cannot run migration directly. Please run this SQL in your database:',
          sql: migrationSQL,
          message: 'Copy the SQL above and run it in your Supabase SQL editor'
        }, { status: 400 });
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[Migration] Migration completed successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Updated_by column added successfully to organizations table' 
    });
    
  } catch (error) {
    console.error('[Migration] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        sql: `
-- Run this SQL manually in your Supabase dashboard:

-- Add updated_by column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Add updated_at timestamp if it doesn't exist  
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        `
      },
      { status: 500 }
    );
  }
} 