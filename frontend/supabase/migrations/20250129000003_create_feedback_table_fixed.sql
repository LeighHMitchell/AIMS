-- Create feedback table for user suggestions, questions, and feature requests
-- Migration: 20250129000003_create_feedback_table_fixed.sql
-- This version handles existing policies/triggers

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can create own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Super users can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Super users can update all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Super users can delete feedback" ON public.feedback;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_feedback_updated_at ON public.feedback;

-- Create feedback table (will not create if already exists)
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('question', 'comment', 'feature_request', 'bug_report', 'suggestion')),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  admin_notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance (will not create if already exists)
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON public.feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_priority ON public.feedback(priority);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (fresh ones after dropping existing)
-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own feedback
CREATE POLICY "Users can create own feedback" ON public.feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Super users can view all feedback
CREATE POLICY "Super users can view all feedback" ON public.feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'super_user'
    )
  );

-- Super users can update all feedback
CREATE POLICY "Super users can update all feedback" ON public.feedback
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'super_user'
    )
  );

-- Super users can delete feedback if needed
CREATE POLICY "Super users can delete feedback" ON public.feedback
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'super_user'
    )
  );

-- Create updated_at trigger function (will replace if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger (fresh one after dropping existing)
CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

-- Add some sample data for testing (optional - remove if you don't want sample data)
-- INSERT INTO public.feedback (user_id, category, subject, message) VALUES 
-- (
--   (SELECT id FROM public.users WHERE role = 'super_user' LIMIT 1),
--   'suggestion',
--   'Test Feedback',
--   'This is a test feedback to verify the system is working correctly.'
-- );

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Feedback table and policies created successfully!';
END $$;
