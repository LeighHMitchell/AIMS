// Script to check database schema
// Run this with: npx ts-node src/scripts/check-db-schema.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('🔍 Checking database schema...')
  
  try {
    // Check activities table structure
    console.log('\n1. Activities table columns:')
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .limit(1)
      
    if (activitiesError) {
      console.error('❌ Activities table error:', activitiesError.message)
    } else if (activities && activities.length > 0) {
      console.log('✅ Activities table columns:', Object.keys(activities[0]))
    }
    
    // Check if comments table exists
    console.log('\n2. Checking activity_comments table:')
    const { data: comments, error: commentsError } = await supabase
      .from('activity_comments')
      .select('*')
      .limit(1)
      
    if (commentsError) {
      console.error('❌ Comments table error:', commentsError.message)
      console.log('The comments table probably doesn\'t exist yet')
    } else {
      console.log('✅ Comments table exists')
      if (comments && comments.length > 0) {
        console.log('Comments columns:', Object.keys(comments[0]))
      }
    }
    
    // Check if users table exists and structure
    console.log('\n3. Users table structure:')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      
    if (usersError) {
      console.error('❌ Users table error:', usersError.message)
    } else if (users && users.length > 0) {
      console.log('✅ Users table columns:', Object.keys(users[0]))
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error)
  }
}

checkSchema().catch(console.error)