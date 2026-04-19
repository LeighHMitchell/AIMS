import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { readFileSync } from 'fs'

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function importActivitiesSimple() {
  
  try {
    // Get the fixed files
    const activitiesPath = resolve(__dirname, '../../myanmar-activities-fixed.json')
    const activities = JSON.parse(readFileSync(activitiesPath, 'utf-8'))
    
    
    // First, let's check what columns actually exist
    const { data: columns, error: schemaError } = await supabase
      .from('activities')
      .select('*')
      .limit(0)
    
    if (schemaError) {
      console.error('Error checking schema:', schemaError)
      return
    }
    
    // Import activities with only basic fields
    let successCount = 0
    let errorCount = 0
    
    for (const activity of activities) {
      // Create a basic activity object with only essential fields
      const basicActivity = {
        iati_id: activity.iati_id,
        title: activity.title,
        description: activity.description,
        activity_status: activity.activity_status, // Already converted to numeric
        planned_start_date: activity.start_date,
        planned_end_date: activity.end_date,
        created_by_org: activity.reporting_org_id,
        
        // Default values for required fields
        publication_status: 'published',
        submission_status: 'draft',
        collaboration_type: '1' // Bilateral
      }
      
      const { data, error } = await supabase
        .from('activities')
        .insert(basicActivity)
        .select()
      
      if (error) {
        console.error(`❌ Failed to import ${activity.iati_id}: ${error.message}`)
        
        errorCount++
      } else {
        successCount++
      }
    }
    
    
    if (successCount > 0) {
    }
    
  } catch (error) {
    console.error('❌ Import error:', error)
    process.exit(1)
  }
}

// Run the import
importActivitiesSimple() 