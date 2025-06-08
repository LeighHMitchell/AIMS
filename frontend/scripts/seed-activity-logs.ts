import { createClient } from '@supabase/supabase-js'
import { subDays, format } from 'date-fns'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
} else {
  console.log('.env.local file not found at:', envPath)
  console.log('\nPlease create a .env.local file in the frontend directory with:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key')
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
  console.log('\nRefer to SUPABASE_SETUP_GUIDE.md for more details.')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing required environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗ Missing')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✓' : '✗ Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const actions = [
  'create',
  'edit',
  'publish',
  'add_partner',
  'update_partner',
  'add_transaction',
  'edit_transaction',
  'submit_validation',
  'validate',
]

async function seedActivityLogs() {
  console.log('Starting to seed activity logs...')
  
  try {
    // Get a sample user to use for the logs
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name, role')
      .limit(1)
    
    if (userError || !users || users.length === 0) {
      console.error('No users found or error fetching users:', userError)
      return
    }
    
    const user = users[0]
    console.log(`Using user: ${user.name} (${user.id})`)
    
    // Generate activity logs for the past 365 days
    const logs = []
    const today = new Date()
    
    for (let i = 0; i < 365; i++) {
      const date = subDays(today, i)
      
      // Generate 0-5 activities per day with varying probability
      const rand = Math.random()
      let activityCount = 0
      
      if (rand < 0.3) {
        activityCount = 0 // 30% chance of no activity
      } else if (rand < 0.6) {
        activityCount = Math.floor(Math.random() * 3) + 1 // 30% chance of 1-3 activities
      } else if (rand < 0.85) {
        activityCount = Math.floor(Math.random() * 5) + 3 // 25% chance of 3-7 activities
      } else {
        activityCount = Math.floor(Math.random() * 10) + 8 // 15% chance of 8-17 activities
      }
      
      for (let j = 0; j < activityCount; j++) {
        const action = actions[Math.floor(Math.random() * actions.length)]
        
        logs.push({
          user_id: user.id,
          action: action,
          created_at: date.toISOString(),
          details: {
            entityType: 'activity',
            entityId: `test-${i}-${j}`,
            activityTitle: `Test Activity ${i}-${j}`,
            user: {
              id: user.id,
              name: user.name,
              role: user.role,
            },
            metadata: {
              test: true,
              seedDate: new Date().toISOString(),
            },
          },
        })
      }
    }
    
    console.log(`Generated ${logs.length} activity logs`)
    
    // Insert logs in batches of 100
    const batchSize = 100
    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize)
      const { error } = await supabase
        .from('activity_logs')
        .insert(batch)
      
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
      } else {
        console.log(`Inserted batch ${i / batchSize + 1} of ${Math.ceil(logs.length / batchSize)}`)
      }
    }
    
    console.log('✅ Activity logs seeded successfully!')
    
    // Display summary
    const { data: summary } = await supabase
      .from('activity_logs')
      .select('created_at')
      .gte('created_at', subDays(today, 365).toISOString())
      .order('created_at', { ascending: false })
    
    if (summary) {
      console.log(`\nTotal logs in database: ${summary.length}`)
      console.log(`Date range: ${format(new Date(summary[summary.length - 1].created_at), 'yyyy-MM-dd')} to ${format(new Date(summary[0].created_at), 'yyyy-MM-dd')}`)
    }
    
  } catch (error) {
    console.error('Error seeding activity logs:', error)
  }
}

// Run the seed function
seedActivityLogs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })