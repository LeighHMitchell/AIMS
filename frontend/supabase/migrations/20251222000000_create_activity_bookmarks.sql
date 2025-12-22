-- Create activity_bookmarks table for user-specific activity bookmarking
CREATE TABLE IF NOT EXISTS activity_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_activity_bookmarks_user_id ON activity_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_bookmarks_activity_id ON activity_bookmarks(activity_id);

-- Enable Row Level Security
ALTER TABLE activity_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own bookmarks
CREATE POLICY "Users can view own bookmarks" ON activity_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks" ON activity_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON activity_bookmarks
  FOR DELETE USING (auth.uid() = user_id);
