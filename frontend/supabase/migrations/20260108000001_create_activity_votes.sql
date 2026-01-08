-- Activity Votes System Migration
-- Replaces simple likes with Reddit-style upvote/downvote system
-- Users can upvote (+1), downvote (-1), or have no vote (0)

-- Create activity_votes table
CREATE TABLE IF NOT EXISTS activity_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote SMALLINT NOT NULL CHECK (vote IN (-1, 0, 1)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_votes_activity_id ON activity_votes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_votes_user_id ON activity_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_votes_vote ON activity_votes(vote) WHERE vote != 0;

-- Add vote count columns to activities table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'upvote_count') THEN
        ALTER TABLE activities ADD COLUMN upvote_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'downvote_count') THEN
        ALTER TABLE activities ADD COLUMN downvote_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'vote_score') THEN
        ALTER TABLE activities ADD COLUMN vote_score INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add RLS (Row Level Security) policies
ALTER TABLE activity_votes ENABLE ROW LEVEL SECURITY;

-- Policies for activity votes
DROP POLICY IF EXISTS "Anyone can view activity votes" ON activity_votes;
DROP POLICY IF EXISTS "Authenticated users can insert their own votes" ON activity_votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON activity_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON activity_votes;

CREATE POLICY "Anyone can view activity votes" ON activity_votes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert their own votes" ON activity_votes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own votes" ON activity_votes
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own votes" ON activity_votes
    FOR DELETE USING (true);

-- Function to update vote counts when votes change
CREATE OR REPLACE FUNCTION update_activity_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    old_vote SMALLINT;
    new_vote SMALLINT;
    target_activity_id UUID;
BEGIN
    -- Determine the activity_id and vote values
    IF TG_OP = 'INSERT' THEN
        target_activity_id := NEW.activity_id;
        old_vote := 0;
        new_vote := NEW.vote;
    ELSIF TG_OP = 'UPDATE' THEN
        target_activity_id := NEW.activity_id;
        old_vote := OLD.vote;
        new_vote := NEW.vote;
    ELSIF TG_OP = 'DELETE' THEN
        target_activity_id := OLD.activity_id;
        old_vote := OLD.vote;
        new_vote := 0;
    END IF;

    -- Skip if vote hasn't changed
    IF old_vote = new_vote THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Update the activity's vote counts
    UPDATE activities
    SET
        upvote_count = GREATEST(0, COALESCE(upvote_count, 0)
            - CASE WHEN old_vote = 1 THEN 1 ELSE 0 END
            + CASE WHEN new_vote = 1 THEN 1 ELSE 0 END),
        downvote_count = GREATEST(0, COALESCE(downvote_count, 0)
            - CASE WHEN old_vote = -1 THEN 1 ELSE 0 END
            + CASE WHEN new_vote = -1 THEN 1 ELSE 0 END),
        vote_score = COALESCE(vote_score, 0) - old_vote + new_vote
    WHERE id = target_activity_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for vote count updates
DROP TRIGGER IF EXISTS trigger_update_activity_vote_counts ON activity_votes;
CREATE TRIGGER trigger_update_activity_vote_counts
    AFTER INSERT OR UPDATE OR DELETE ON activity_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_vote_counts();

-- Migrate existing likes to upvotes
INSERT INTO activity_votes (activity_id, user_id, vote, created_at, updated_at)
SELECT
    entity_id AS activity_id,
    user_id,
    1 AS vote,
    created_at,
    created_at AS updated_at
FROM entity_likes
WHERE entity_type = 'activity'
ON CONFLICT (activity_id, user_id) DO NOTHING;

-- Update activities table with migrated vote counts
UPDATE activities a
SET
    upvote_count = (SELECT COUNT(*) FROM activity_votes av WHERE av.activity_id = a.id AND av.vote = 1),
    downvote_count = (SELECT COUNT(*) FROM activity_votes av WHERE av.activity_id = a.id AND av.vote = -1),
    vote_score = (SELECT COALESCE(SUM(av.vote), 0) FROM activity_votes av WHERE av.activity_id = a.id);

-- Create view for vote aggregates (useful for queries)
CREATE OR REPLACE VIEW activity_vote_summary AS
SELECT
    a.id AS activity_id,
    COALESCE(a.upvote_count, 0) AS upvote_count,
    COALESCE(a.downvote_count, 0) AS downvote_count,
    COALESCE(a.vote_score, 0) AS vote_score,
    (SELECT COUNT(*) FROM activity_votes av WHERE av.activity_id = a.id AND av.vote != 0) AS total_voters
FROM activities a;

-- Grant necessary permissions
GRANT ALL ON activity_votes TO authenticated;
GRANT SELECT ON activity_votes TO anon;
GRANT SELECT ON activity_vote_summary TO authenticated;
GRANT SELECT ON activity_vote_summary TO anon;

-- Add comments for documentation
COMMENT ON TABLE activity_votes IS 'Reddit-style voting system for activities (+1 upvote, -1 downvote, 0 no vote)';
COMMENT ON COLUMN activity_votes.vote IS 'Vote value: 1 for upvote, -1 for downvote, 0 for no vote';
COMMENT ON COLUMN activities.upvote_count IS 'Denormalized count of upvotes for performance';
COMMENT ON COLUMN activities.downvote_count IS 'Denormalized count of downvotes for performance';
COMMENT ON COLUMN activities.vote_score IS 'Net score: upvotes minus downvotes';
