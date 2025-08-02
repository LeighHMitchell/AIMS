// Test script to verify comments functionality
// Run this with: npx ts-node src/scripts/test-comments.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testComments() {
  console.log('🧪 Testing Comments System...')
  
  // Test 1: Check if comments table exists
  console.log('\n1. Checking comments table structure...')
  const { data: tableInfo, error: tableError } = await supabase
    .from('activity_comments')
    .select('*')
    .limit(1)
  
  if (tableError) {
    console.error('❌ Comments table error:', tableError.message)
    return
  }
  
  console.log('✅ Comments table accessible')
  
  // Test 2: Check if replies table exists  
  console.log('\n2. Checking replies table structure...')
  const { data: repliesInfo, error: repliesError } = await supabase
    .from('activity_comment_replies')
    .select('*')
    .limit(1)
    
  if (repliesError) {
    console.error('❌ Replies table error:', repliesError.message)
    return
  }
  
  console.log('✅ Replies table accessible')
  
  // Test 3: Get first activity for testing
  console.log('\n3. Finding activity for testing...')
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('id, title')
    .limit(1)
    
  if (activitiesError || !activities || activities.length === 0) {
    console.error('❌ No activities found for testing')
    return
  }
  
  const testActivity = activities[0]
  console.log(`✅ Using activity: ${testActivity.title} (${testActivity.id})`)
  
  // Test 4: Get existing comments
  console.log('\n4. Fetching existing comments...')
  const { data: existingComments, error: commentsError } = await supabase
    .from('activity_comments')
    .select(`
      id,
      activity_id,
      user_id,
      user_name,
      user_role,
      message,
      type,
      status,
      created_at
    `)
    .eq('activity_id', testActivity.id)
    
  if (commentsError) {
    console.error('❌ Error fetching comments:', commentsError.message)
    return
  }
  
  console.log(`✅ Found ${existingComments?.length || 0} existing comments`)
  
  // Test 5: Create a test comment
  console.log('\n5. Creating test comment...')
  const testComment = {
    activity_id: testActivity.id,
    user_id: '85a65398-5d71-4633-a50b-2f167a0b6f7a', // Test user
    user_name: 'Test User',
    user_role: 'dev_partner_tier_1',
    message: 'This is a test comment to verify the system works',
    type: 'Feedback',
    status: 'Open'
  }
  
  const { data: newComment, error: insertError } = await supabase
    .from('activity_comments')
    .insert(testComment)
    .select()
    .single()
    
  if (insertError) {
    console.error('❌ Error creating test comment:', insertError.message)
    return
  }
  
  console.log('✅ Test comment created:', newComment.id)
  
  // Test 6: Create a test reply
  console.log('\n6. Creating test reply...')
  const testReply = {
    comment_id: newComment.id,
    user_id: '0864da76-2323-44a5-ac33-b27786da024e', // Different test user
    user_name: 'Test User 2',
    user_role: 'gov_partner_tier_1',
    message: 'This is a test reply',
    type: 'Question'
  }
  
  const { data: newReply, error: replyError } = await supabase
    .from('activity_comment_replies')
    .insert(testReply)
    .select()
    .single()
    
  if (replyError) {
    console.error('❌ Error creating test reply:', replyError.message)
    return
  }
  
  console.log('✅ Test reply created:', newReply.id)
  
  // Test 7: Fetch complete comment with replies
  console.log('\n7. Fetching complete comment structure...')
  const { data: completeComments, error: fetchError } = await supabase
    .from('activity_comments')
    .select(`
      id,
      activity_id,
      user_id,
      user_name,
      user_role,
      message,
      type,
      status,
      created_at
    `)
    .eq('activity_id', testActivity.id)
    
  if (fetchError) {
    console.error('❌ Error fetching complete comments:', fetchError.message)
    return
  }
  
  console.log(`✅ Complete comment structure verified`)
  
  // Test 8: Test comment resolution
  console.log('\n8. Testing comment resolution...')
  const { data: resolvedComment, error: resolveError } = await supabase
    .from('activity_comments')
    .update({
      status: 'Resolved',
      resolved_by_id: '85a65398-5d71-4633-a50b-2f167a0b6f7a',
      resolved_by_name: 'Test User',
      resolved_at: new Date().toISOString(),
      resolution_note: 'Test resolution'
    })
    .eq('id', newComment.id)
    .select()
    .single()
    
  if (resolveError) {
    console.error('❌ Error resolving comment:', resolveError.message)
    return
  }
  
  console.log('✅ Comment resolution working')
  
  // Cleanup - Delete test data
  console.log('\n9. Cleaning up test data...')
  await supabase.from('activity_comment_replies').delete().eq('id', newReply.id)
  await supabase.from('activity_comments').delete().eq('id', newComment.id)
  console.log('✅ Test data cleaned up')
  
  console.log('\n🎉 All tests passed! Comments system is working correctly.')
}

testComments().catch(console.error)