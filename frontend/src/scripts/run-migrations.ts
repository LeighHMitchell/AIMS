import { getSupabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  const supabase = getSupabaseAdmin();
  
  try {
    
    // Read the SQL files
    const activitySectorsSQL = fs.readFileSync(
      path.join(__dirname, '../../sql/create_activity_sectors_table.sql'),
      'utf8'
    );
    
    const customGroupsSQL = fs.readFileSync(
      path.join(__dirname, '../../sql/create_custom_groups_table.sql'),
      'utf8'
    );
    
    // Run activity_sectors migration
    const { error: sectorsError } = await supabase.rpc('exec_sql', {
      sql: activitySectorsSQL
    });
    
    if (sectorsError) {
      console.error('Error creating activity_sectors:', sectorsError);
    } else {
    }
    
    // Run custom_groups migration
    const { error: groupsError } = await supabase.rpc('exec_sql', {
      sql: customGroupsSQL
    });
    
    if (groupsError) {
      console.error('Error creating custom_groups:', groupsError);
    } else {
    }
    
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations(); 