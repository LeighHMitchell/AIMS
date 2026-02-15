-- Activity Views System Migration
-- Tracks unique user views of activities with a denormalized count on activities table

-- Create activity_views table
CREATE TABLE IF NOT EXISTS activity_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_views_activity_id ON activity_views(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_views_user_id ON activity_views(user_id);

-- Add unique_view_count column to activities table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'unique_view_count') THEN
        ALTER TABLE activities ADD COLUMN unique_view_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add RLS (Row Level Security) policies
ALTER TABLE activity_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view activity views" ON activity_views;
DROP POLICY IF EXISTS "Authenticated users can create activity views" ON activity_views;

CREATE POLICY "Anyone can view activity views" ON activity_views
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create activity views" ON activity_views
    FOR INSERT WITH CHECK (true);

-- Function to update view count when views are added/removed
CREATE OR REPLACE FUNCTION update_activity_view_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE activities
        SET unique_view_count = COALESCE(unique_view_count, 0) + 1
        WHERE id = NEW.activity_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE activities
        SET unique_view_count = GREATEST(0, COALESCE(unique_view_count, 0) - 1)
        WHERE id = OLD.activity_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for view count updates
DROP TRIGGER IF EXISTS trigger_update_activity_view_count ON activity_views;
CREATE TRIGGER trigger_update_activity_view_count
    AFTER INSERT OR DELETE ON activity_views
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_view_count();

-- Grant necessary permissions
GRANT ALL ON activity_views TO authenticated;
GRANT SELECT ON activity_views TO anon;

-- Add comments for documentation
COMMENT ON TABLE activity_views IS 'Tracks unique user views of activities';
COMMENT ON COLUMN activity_views.activity_id IS 'ID of the activity being viewed';
COMMENT ON COLUMN activity_views.user_id IS 'ID of the user who viewed the activity';
COMMENT ON COLUMN activity_views.viewed_at IS 'Timestamp of when the view was first recorded';
