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

async function importActivities() {
  console.log('📥 Starting Myanmar data import...\n')
  
  try {
    // Get the fixed files with corrected transaction types
    const activitiesPath = resolve(__dirname, '../../myanmar-activities-fixed.json')
    const transactionsPath = resolve(__dirname, '../../myanmar-transactions-fixed.json')
    
    // Read the JSON files
    const activities = JSON.parse(readFileSync(activitiesPath, 'utf-8'))
    const transactions = JSON.parse(readFileSync(transactionsPath, 'utf-8'))
    
    console.log(`📋 Found ${activities.length} activities and ${transactions.length} transactions to import\n`)
    
    // Import activities
    console.log('🔄 Importing activities...')
    let successCount = 0
    let errorCount = 0
    
    for (const activity of activities) {
      // Map the generated fields to your database schema
      const activityData = {
        iati_id: activity.iati_id,
        title: activity.title,
        description: activity.description,
        objectives: activity.objectives,
        target_groups: activity.target_groups.join(', '), // Or use JSON if your DB supports it
        recipient_country: activity.recipient_country,
        
        // IATI fields
        default_aid_type: activity.default_aid_type,
        default_flow_type: activity.default_flow_type,
        default_finance_type: activity.default_finance_type,
        activity_status: activity.activity_status,
        
        // Dates - adjust field names to match your schema
        planned_start_date: activity.start_date,
        planned_end_date: activity.end_date,
        
        // Organization - adjust field name to match your schema
        created_by_org: activity.reporting_org_id,
        
        // Add any other required fields with defaults
        collaboration_type: '1', // Bilateral
        publication_status: 'published',
        submission_status: 'draft'
      }
      
      const { data, error } = await supabase
        .from('activities')
        .insert(activityData)
        .select()
      
      if (error) {
        console.error(`❌ Failed to import activity ${activity.iati_id}:`, error.message)
        errorCount++
      } else {
        console.log(`✅ Imported activity: ${activity.title}`)
        successCount++
        
        // If successful, you might want to:
        // 1. Store the activity ID for transaction import
        // 2. Import related data (sectors, participating orgs, etc.)
      }
    }
    
    console.log(`\n📊 Activity import complete: ${successCount} succeeded, ${errorCount} failed`)
    
    // Import transactions
    console.log('\n🔄 Importing transactions...')
    successCount = 0
    errorCount = 0
    
    // Note: You'll need to map activity_iati_id to actual activity IDs
    // This is a simplified example
    
    console.log('\n💡 Transaction import requires mapping IATI IDs to database IDs.')
    console.log('Please implement the transaction import based on your schema.')
    
    console.log('\n✨ Import process completed!')
    
  } catch (error) {
    console.error('❌ Import error:', error)
    process.exit(1)
  }
}

// Run the import
importActivities() 