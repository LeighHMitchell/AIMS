-- Update feedback table policies to allow dev partners to manage feedback
-- Migration: 20250129000004_update_feedback_policies.sql

-- Drop existing super user policies
DROP POLICY IF EXISTS "Super users can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Super users can update all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Super users can delete feedback" ON public.feedback;

-- Create new policies that allow super users AND dev partners to manage feedback
-- Super users and dev partners can view all feedback
CREATE POLICY "Admin users can view all feedback" ON public.feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() 
      AND role IN ('super_user', 'dev_partner_tier_1', 'dev_partner_tier_2')
    )
  );

-- Super users and dev partners can update all feedback
CREATE POLICY "Admin users can update all feedback" ON public.feedback
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() 
      AND role IN ('super_user', 'dev_partner_tier_1', 'dev_partner_tier_2')
    )
  );

-- Super users and dev partners can delete feedback if needed
CREATE POLICY "Admin users can delete feedback" ON public.feedback
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() 
      AND role IN ('super_user', 'dev_partner_tier_1', 'dev_partner_tier_2')
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Feedback policies updated to allow dev partners to manage feedback!';
END $$;
