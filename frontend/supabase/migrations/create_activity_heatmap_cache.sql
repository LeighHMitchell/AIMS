-- Create activity heatmap cache table
CREATE TABLE IF NOT EXISTS activity_heatmap_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  action_breakdown JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_heatmap_cache_date ON activity_heatmap_cache(date);
CREATE INDEX IF NOT EXISTS idx_activity_heatmap_cache_user_date ON activity_heatmap_cache(user_id, date);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_heatmap_cache_unique ON activity_heatmap_cache(date, user_id);

-- Add RLS policies
ALTER TABLE activity_heatmap_cache ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own heatmap data
CREATE POLICY "Users can view their own heatmap data" ON activity_heatmap_cache
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Only allow system/admin to insert/update cache
CREATE POLICY "Only system can update heatmap cache" ON activity_heatmap_cache
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');