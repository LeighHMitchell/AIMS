// Script to diagnose the comments table structure
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnoseCommentsTable() {
  
  try {
    // Try to get table info
    const { data: tableInfo, error: tableError } = await supabase
      .from('activity_comments')
      .select('*')
      .limit(0)
    
    if (tableError) {
      return
    }
    
    
    // Try different inserts to understand the schema
    
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
    } else {
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
    } else {
    }
    
    // Get actual comments to see structure
    const { data: comments, error: commentsError } = await supabase
      .from('activity_comments')
      .select('*')
      .limit(5)
    
    if (!commentsError && comments && comments.length > 0) {
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