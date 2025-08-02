-- Update activity_comments table to include all required fields for enhanced comments system
-- This aligns the schema with what the application expects

-- Add missing columns to activity_comments table
ALTER TABLE public.activity_comments 
ADD COLUMN IF NOT EXISTS user_name text,
ADD COLUMN IF NOT EXISTS user_role text,
ADD COLUMN IF NOT EXISTS message text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Open',
ADD COLUMN IF NOT EXISTS context_section text,
ADD COLUMN IF NOT EXISTS context_field text,
ADD COLUMN IF NOT EXISTS resolved_by_id uuid,
ADD COLUMN IF NOT EXISTS resolved_by_name text,
ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS resolution_note text,
ADD COLUMN IF NOT EXISTS mentions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_read jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add check constraint for status
ALTER TABLE public.activity_comments 
ADD CONSTRAINT IF NOT EXISTS activity_comments_status_check 
CHECK (status = ANY (ARRAY['Open'::text, 'Resolved'::text]));

-- Create trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for activity_comments updated_at
DROP TRIGGER IF EXISTS update_activity_comments_updated_at ON activity_comments;
CREATE TRIGGER update_activity_comments_updated_at 
    BEFORE UPDATE ON activity_comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing data: copy content to message if message is null
UPDATE public.activity_comments 
SET message = content 
WHERE message IS NULL AND content IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_comments_status ON public.activity_comments USING btree (status);
CREATE INDEX IF NOT EXISTS idx_activity_comments_context_section ON public.activity_comments USING btree (context_section);
CREATE INDEX IF NOT EXISTS idx_activity_comments_updated_at ON public.activity_comments USING btree (updated_at DESC);

-- Update activity_comment_replies to include missing fields if they don't exist
ALTER TABLE public.activity_comment_replies 
ADD COLUMN IF NOT EXISTS mentions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_read jsonb DEFAULT '{}'::jsonb;

-- Add indexes for replies performance
CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_mentions ON public.activity_comment_replies USING gin (mentions);
CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_updated_at ON public.activity_comment_replies USING btree (updated_at DESC); 