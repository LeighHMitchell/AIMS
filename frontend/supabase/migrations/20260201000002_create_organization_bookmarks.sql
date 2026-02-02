CREATE TABLE IF NOT EXISTS organization_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_bookmarks_user_id ON organization_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_bookmarks_organization_id ON organization_bookmarks(organization_id);

ALTER TABLE organization_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own organization bookmarks" ON organization_bookmarks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own organization bookmarks" ON organization_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own organization bookmarks" ON organization_bookmarks
  FOR DELETE USING (auth.uid() = user_id);
