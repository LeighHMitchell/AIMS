-- Seed script to add upvotes and downvotes to 10 recently updated activities
-- This uses the trigger system, so vote_score, upvote_count, and downvote_count
-- will be automatically updated on the activities table.

-- First, let's see what users we have to assign votes from
-- SELECT id, email FROM users LIMIT 5;

-- Create votes for the 10 most recently updated activities
-- We'll simulate votes from multiple users with varying patterns

DO $$
DECLARE
    activity_record RECORD;
    user_record RECORD;
    vote_value SMALLINT;
    counter INT := 0;
BEGIN
    -- Loop through the 10 most recently updated activities
    FOR activity_record IN
        SELECT id, title_narrative
        FROM activities
        ORDER BY updated_at DESC
        LIMIT 10
    LOOP
        counter := counter + 1;

        -- Get up to 5 random users to vote on each activity
        FOR user_record IN
            SELECT id FROM users ORDER BY random() LIMIT 5
        LOOP
            -- Assign vote values with some variety:
            -- 70% upvotes, 20% downvotes, 10% neutral (skipped)
            -- Also vary by activity position to create different scores
            IF random() < 0.1 THEN
                -- Skip this vote (10% chance)
                CONTINUE;
            ELSIF random() < 0.75 + (counter * 0.02) THEN
                -- Upvote (higher chance for earlier activities)
                vote_value := 1;
            ELSE
                -- Downvote
                vote_value := -1;
            END IF;

            -- Insert the vote (ON CONFLICT handles duplicates)
            INSERT INTO activity_votes (activity_id, user_id, vote, created_at, updated_at)
            VALUES (activity_record.id, user_record.id, vote_value, NOW(), NOW())
            ON CONFLICT (activity_id, user_id)
            DO UPDATE SET vote = EXCLUDED.vote, updated_at = NOW();

        END LOOP;

        RAISE NOTICE 'Added votes for activity: %', activity_record.title_narrative;
    END LOOP;

    RAISE NOTICE 'Finished adding votes to % activities', counter;
END $$;

-- Verify the results
SELECT
    a.id,
    LEFT(a.title_narrative, 50) AS title,
    a.upvote_count,
    a.downvote_count,
    a.vote_score,
    (SELECT COUNT(*) FROM activity_votes av WHERE av.activity_id = a.id) AS total_votes
FROM activities a
WHERE a.upvote_count > 0 OR a.downvote_count > 0
ORDER BY a.updated_at DESC
LIMIT 10;
