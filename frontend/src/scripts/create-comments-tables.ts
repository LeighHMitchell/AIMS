// Script to create comments tables if they don't exist
// Run this with: npx ts-node src/scripts/create-comments-tables.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function createCommentsTables() {
  
  try {
    // Create activity_comments table
    const createCommentsTable = `
      CREATE TABLE IF NOT EXISTS activity_comments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          user_name TEXT NOT NULL,
          user_role TEXT NOT NULL,
          type TEXT DEFAULT 'Feedback' CHECK (type IN ('Question', 'Feedback')),
          message TEXT NOT NULL,
          status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Resolved')),
          resolved_by_id UUID,
          resolved_by_name TEXT,
          resolved_at TIMESTAMPTZ,
          resolution_note TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
    
    const { error: commentsError } = await supabase.rpc('exec_sql', { sql: createCommentsTable })
    
    if (commentsError) {
    } else {
    }
    
    // Create activity_comment_replies table
    const createRepliesTable = `
      CREATE TABLE IF NOT EXISTS activity_comment_replies (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          comment_id UUID NOT NULL REFERENCES activity_comments(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          user_name TEXT NOT NULL,
          user_role TEXT NOT NULL,
          type TEXT DEFAULT 'Feedback' CHECK (type IN ('Question', 'Feedback')),
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
    
    const { error: repliesError } = await supabase.rpc('exec_sql', { sql: createRepliesTable })
    
    if (repliesError) {
    } else {
    }
    
    // Test tables exist by selecting from them
    
    const { data: commentsTest, error: commentsTestError } = await supabase
      .from('activity_comments')
      .select('count(*)')
      .limit(1)
      
    if (commentsTestError) {
      console.error('❌ Comments table test failed:', commentsTestError.message)
    } else {
    }
    
    const { data: repliesTest, error: repliesTestError } = await supabase
      .from('activity_comment_replies')
      .select('count(*)')
      .limit(1)
      
    if (repliesTestError) {
      console.error('❌ Replies table test failed:', repliesTestError.message)
    } else {
    }
    
    
  } catch (error) {
    console.error('❌ Error setting up tables:', error)
  }
}

createCommentsTables().catch(console.error)