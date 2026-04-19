// Script to check database schema
// Run this with: npx ts-node src/scripts/check-db-schema.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  
  try {
    // Check activities table structure
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .limit(1)
      
    if (activitiesError) {
      console.error('❌ Activities table error:', activitiesError.message)
    } else if (activities && activities.length > 0) {
    }
    
    // Check if comments table exists
    const { data: comments, error: commentsError } = await supabase
      .from('activity_comments')
      .select('*')
      .limit(1)
      
    if (commentsError) {
      console.error('❌ Comments table error:', commentsError.message)
    } else {
      if (comments && comments.length > 0) {
      }
    }
    
    // Check if users table exists and structure
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      
    if (usersError) {
      console.error('❌ Users table error:', usersError.message)
    } else if (users && users.length > 0) {
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error)
  }
}

checkSchema().catch(console.error)