import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function addDescriptionColumns() {
  console.log('Adding description type columns to activities table...')
  
  try {
    const columnsToAdd = [
      'description_objectives',
      'description_target_groups', 
      'description_other'
    ]
    
    // Test if columns exist by trying to select them
    for (const columnName of columnsToAdd) {
      console.log(`\nTesting column: ${columnName}`)
      
      const { data, error } = await supabase
        .from('activities')
        .select(columnName)
        .limit(1)
      
      if (error) {
        if (error.code === '42703') {  // Column does not exist
          console.log(`Column ${columnName} does not exist. Needs to be created manually.`)
        } else {
          console.error(`Error testing ${columnName}:`, error)
        }
      } else {
        console.log(`Column ${columnName} already exists ✓`)
      }
    }
    
    console.log('\n=== Manual Database Setup Required ===')
    console.log('Please run this SQL in your Supabase SQL editor:')
    console.log(`
-- Add description type columns to activities table
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_objectives TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_target_groups TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description_other TEXT;

-- Add comments for documentation
COMMENT ON COLUMN activities.description_objectives IS 'Activity description focusing on specific objectives (IATI Description Type 2)';
COMMENT ON COLUMN activities.description_target_groups IS 'Activity description focusing on target groups and beneficiaries (IATI Description Type 3)';
COMMENT ON COLUMN activities.description_other IS 'Additional activity description for other relevant information (IATI Description Type 4)';
`)
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

addDescriptionColumns()