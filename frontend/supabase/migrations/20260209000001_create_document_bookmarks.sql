-- Personal bookmarks (My Library)
CREATE TABLE IF NOT EXISTS document_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  document_title TEXT,
  document_format TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, document_url)
);

-- Org-wide bookmarks (Reading Room)
CREATE TABLE IF NOT EXISTS reading_room_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  document_title TEXT,
  document_format TEXT,
  added_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, document_url)
);

-- Indexes
CREATE INDEX idx_document_bookmarks_user ON document_bookmarks(user_id);
CREATE INDEX idx_reading_room_bookmarks_org ON reading_room_bookmarks(organization_id);

-- RLS for document_bookmarks (personal)
ALTER TABLE document_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks"
  ON document_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
  ON document_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON document_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for reading_room_bookmarks (org-wide)
ALTER TABLE reading_room_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reading room bookmarks for their org"
  ON reading_room_bookmarks FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can add to reading room for their org"
  ON reading_room_bookmarks FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can remove from reading room for their org"
  ON reading_room_bookmarks FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );
