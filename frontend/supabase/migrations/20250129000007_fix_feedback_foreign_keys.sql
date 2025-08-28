-- Fix feedback table foreign key references
-- Migration: 20250129000007_fix_feedback_foreign_keys.sql
-- This fixes the foreign key references to use public.users instead of auth.users

-- First, drop the existing feedback table if it has incorrect foreign keys
DROP TABLE IF EXISTS public.feedback CASCADE;

-- Create feedback table with correct foreign key references
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('question', 'comment', 'feature_request', 'bug_report', 'suggestion')),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'archived')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  admin_notes TEXT,
  assigned_to UUID REFERENCES public.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  attachment_url TEXT,
  attachment_filename VARCHAR(255),
  attachment_type VARCHAR(50),
  attachment_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX idx_feedback_category ON public.feedback(category);
CREATE INDEX idx_feedback_status ON public.feedback(status);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX idx_feedback_priority ON public.feedback(priority);
CREATE INDEX idx_feedback_has_attachment ON public.feedback(attachment_url) 
WHERE attachment_url IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (user_id = auth.uid()::text::uuid);

-- Users can create their own feedback
CREATE POLICY "Users can create own feedback" ON public.feedback
  FOR INSERT WITH CHECK (user_id = auth.uid()::text::uuid);

-- Super users can view all feedback
CREATE POLICY "Super users can view all feedback" ON public.feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()::text::uuid AND role = 'super_user'
    )
  );

-- Super users can update all feedback
CREATE POLICY "Super users can update all feedback" ON public.feedback
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()::text::uuid AND role = 'super_user'
    )
  );

-- Super users can delete feedback if needed
CREATE POLICY "Super users can delete feedback" ON public.feedback
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()::text::uuid AND role = 'super_user'
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Feedback table recreated with correct foreign key references!';
END $$;
