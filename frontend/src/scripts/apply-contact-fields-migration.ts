import { getSupabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

async function applyContactFieldsMigration() {
  console.log('🔄 Applying contact fields migration...');
  
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Supabase not configured');
    process.exit(1);
  }
  
  try {
    // Read the migration SQL
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../../supabase/migrations/20250127000000_add_contact_fields_to_users.sql'),
      'utf8'
    );
    
    console.log('📄 Migration SQL loaded');
    console.log('🔄 Executing migration...');
    
    // Execute each SQL statement separately to handle errors better
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 100)}...`);
        
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });
        
        if (error) {
          console.warn(`⚠️  Warning for statement: ${error.message}`);
          // Continue with other statements even if some fail (they might already exist)
        } else {
          console.log('✅ Statement executed successfully');
        }
      }
    }
    
    console.log('🎉 Contact fields migration completed!');
    
    // Verify the new columns exist
    console.log('🔍 Verifying new columns...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'users')
      .eq('table_schema', 'public')
      .in('column_name', ['contact_type', 'secondary_email', 'secondary_phone', 'fax_number', 'notes']);
    
    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError);
    } else {
      console.log('✅ Verified columns:', columns?.map((c: any) => c.column_name) || []);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
applyContactFieldsMigration();
