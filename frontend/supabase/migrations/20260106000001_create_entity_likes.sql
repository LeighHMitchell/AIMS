-- Entity Likes System Migration
-- Creates a unified likes system for activities and organizations
-- Users can like/unlike activities and organizations from their profile pages

-- Create entity_likes table (unified table for both activities and organizations)
CREATE TABLE IF NOT EXISTS entity_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('activity', 'organization')),
    entity_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_entity_likes_entity ON entity_likes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_likes_user_id ON entity_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_entity_likes_created_at ON entity_likes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_likes_activity ON entity_likes(entity_id) WHERE entity_type = 'activity';
CREATE INDEX IF NOT EXISTS idx_entity_likes_organization ON entity_likes(entity_id) WHERE entity_type = 'organization';

-- Add likes_count columns to activities and organizations tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'likes_count') THEN
        ALTER TABLE activities ADD COLUMN likes_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'likes_count') THEN
        ALTER TABLE organizations ADD COLUMN likes_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add RLS (Row Level Security) policies
ALTER TABLE entity_likes ENABLE ROW LEVEL SECURITY;

-- Policies for entity likes
DROP POLICY IF EXISTS "Anyone can view entity likes" ON entity_likes;
DROP POLICY IF EXISTS "Authenticated users can create entity likes" ON entity_likes;
DROP POLICY IF EXISTS "Users can delete their own entity likes" ON entity_likes;

CREATE POLICY "Anyone can view entity likes" ON entity_likes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create entity likes" ON entity_likes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own entity likes" ON entity_likes
    FOR DELETE USING (user_id = auth.uid());

-- Function to update likes count when likes are added/removed
CREATE OR REPLACE FUNCTION update_entity_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.entity_type = 'activity' THEN
            UPDATE activities
            SET likes_count = COALESCE(likes_count, 0) + 1
            WHERE id = NEW.entity_id;
        ELSIF NEW.entity_type = 'organization' THEN
            UPDATE organizations
            SET likes_count = COALESCE(likes_count, 0) + 1
            WHERE id = NEW.entity_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.entity_type = 'activity' THEN
            UPDATE activities
            SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1)
            WHERE id = OLD.entity_id;
        ELSIF OLD.entity_type = 'organization' THEN
            UPDATE organizations
            SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1)
            WHERE id = OLD.entity_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for likes count updates
DROP TRIGGER IF EXISTS trigger_update_entity_likes_count ON entity_likes;
CREATE TRIGGER trigger_update_entity_likes_count
    AFTER INSERT OR DELETE ON entity_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_likes_count();

-- Grant necessary permissions
GRANT ALL ON entity_likes TO authenticated;
GRANT SELECT ON entity_likes TO anon;

-- Add comments for documentation
COMMENT ON TABLE entity_likes IS 'Unified likes table for activities and organizations';
COMMENT ON COLUMN entity_likes.entity_type IS 'Type of entity: activity or organization';
COMMENT ON COLUMN entity_likes.entity_id IS 'ID of the activity or organization being liked';
