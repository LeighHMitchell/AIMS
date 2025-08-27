-- Create feedback table with correct user reference
-- Migration: 20250129000005_create_feedback_table_corrected.sql

-- Drop existing table if it has wrong foreign key reference
-- DROP TABLE IF EXISTS public.feedback;

-- Create feedback table (will not create if already exists)
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('question', 'comment', 'feature_request', 'bug_report', 'suggestion')),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  admin_notes TEXT,
  assigned_to UUID REFERENCES public.users(id),
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

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can create own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Super users can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Super users can update all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Super users can delete feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admin users can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admin users can update all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admin users can delete feedback" ON public.feedback;

-- Create RLS Policies
-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own feedback
CREATE POLICY "Users can create own feedback" ON public.feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin users (super_user and dev partners) can view all feedback
CREATE POLICY "Admin users can view all feedback" ON public.feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() 
      AND role IN ('super_user', 'dev_partner_tier_1', 'dev_partner_tier_2')
    )
  );

-- Admin users can update all feedback
CREATE POLICY "Admin users can update all feedback" ON public.feedback
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() 
      AND role IN ('super_user', 'dev_partner_tier_1', 'dev_partner_tier_2')
    )
  );

-- Admin users can delete feedback if needed
CREATE POLICY "Admin users can delete feedback" ON public.feedback
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() 
      AND role IN ('super_user', 'dev_partner_tier_1', 'dev_partner_tier_2')
    )
  );

-- Create updated_at trigger function (will replace if exists)
CREATE OR REPLACE FUNCTION update_feedback_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_feedback_updated_at ON public.feedback;

-- Create trigger
CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at_column();

-- Grant permissions
GRANT ALL ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

-- Add sample data for testing
INSERT INTO public.feedback (user_id, category, subject, message) 
SELECT 
  '4bc8e3ca-b34b-4c7d-b599-f7e26119cd54',
  'suggestion',
  'Test Feedback',
  'This is a test feedback to verify the system is working correctly.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.feedback 
  WHERE user_id = '4bc8e3ca-b34b-4c7d-b599-f7e26119cd54'
  AND subject = 'Test Feedback'
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Feedback table created successfully with correct user references and sample data!';
END $$;
