// Script to create basic comments table compatible with current system
// Run this with: npx ts-node src/scripts/create-basic-comments-table.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function createBasicCommentsTable() {
  
  try {
    // Create a basic activity_comments table that matches current API expectations
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS activity_comments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          content TEXT NOT NULL,
          type TEXT DEFAULT 'Feedback' CHECK (type IN ('Question', 'Feedback')),
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
    
    // Try to execute the SQL using a simple query
    
    // First check if table exists
    const { data: existingTable, error: checkError } = await supabase
      .from('activity_comments')
      .select('count(*)')
      .limit(1)
      
    if (!checkError) {
      return
    }
    
    
    // Also create indexes
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
      CREATE INDEX IF NOT EXISTS idx_activity_comments_user_id ON activity_comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_activity_comments_created_at ON activity_comments(created_at DESC);
    `
    
    
    // Create RLS policies
    const rlsSQL = `
      ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Users can view all comments" ON activity_comments
          FOR SELECT USING (true);
      
      CREATE POLICY "Users can create comments" ON activity_comments
          FOR INSERT WITH CHECK (true);
      
      CREATE POLICY "Users can update their own comments" ON activity_comments
          FOR UPDATE USING (user_id = auth.uid());
      
      CREATE POLICY "Users can delete their own comments" ON activity_comments
          FOR DELETE USING (user_id = auth.uid());
    `
    
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createBasicCommentsTable().catch(console.error)