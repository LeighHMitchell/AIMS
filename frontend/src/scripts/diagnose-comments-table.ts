// Script to diagnose the comments table structure
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnoseCommentsTable() {
  console.log('🔍 Diagnosing Comments Table Structure...\n')
  
  try {
    // Try to get table info
    const { data: tableInfo, error: tableError } = await supabase
      .from('activity_comments')
      .select('*')
      .limit(0)
    
    if (tableError) {
      console.log('❌ Comments table error:', tableError.message)
      console.log('\nThe comments table likely doesn\'t exist.')
      return
    }
    
    console.log('✅ Comments table exists!\n')
    
    // Try different inserts to understand the schema
    console.log('Testing different field combinations...\n')
    
    // Test 1: Basic insert with content field
    const test1 = await supabase
      .from('activity_comments')
      .insert({
        activity_id: '85b03f24-217e-4cbf-b8e4-79dca60dee1f',
        user_id: '85a65398-5d71-4633-a50b-2f167a0b6f7a',
        content: 'Test comment',
        type: 'feedback' // lowercase
      })
      .select()
    
    if (test1.error) {
      console.log('Test 1 (lowercase type) failed:', test1.error.message)
    } else {
      console.log('✅ Test 1 passed - lowercase type works')
    }
    
    // Test 2: Try with capitalized type
    const test2 = await supabase
      .from('activity_comments')
      .insert({
        activity_id: '85b03f24-217e-4cbf-b8e4-79dca60dee1f',
        user_id: '85a65398-5d71-4633-a50b-2f167a0b6f7a',
        content: 'Test comment 2',
        type: 'Feedback' // Capitalized
      })
      .select()
    
    if (test2.error) {
      console.log('Test 2 (capitalized type) failed:', test2.error.message)
    } else {
      console.log('✅ Test 2 passed - capitalized type works')
    }
    
    // Get actual comments to see structure
    const { data: comments, error: commentsError } = await supabase
      .from('activity_comments')
      .select('*')
      .limit(5)
    
    if (!commentsError && comments && comments.length > 0) {
      console.log('\nSample comment structure:')
      console.log(JSON.stringify(comments[0], null, 2))
    }
    
    // Clean up test data
    if (!test1.error && test1.data) {
      await supabase.from('activity_comments').delete().eq('id', test1.data[0].id)
    }
    if (!test2.error && test2.data) {
      await supabase.from('activity_comments').delete().eq('id', test2.data[0].id)
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

diagnoseCommentsTable().catch(console.error)