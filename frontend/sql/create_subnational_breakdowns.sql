-- Create subnational_breakdowns table for storing regional percentage allocations
-- This script can be run directly in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.subnational_breakdowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    region_name TEXT NOT NULL,
    is_nationwide BOOLEAN DEFAULT FALSE,
    percentage NUMERIC(5,2) CHECK (percentage >= 0 AND percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique region per activity
    UNIQUE(activity_id, region_name),
    
    -- Ensure only one nationwide entry per activity
    EXCLUDE (activity_id WITH =) WHERE (is_nationwide = true)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subnational_breakdowns_activity_id ON public.subnational_breakdowns(activity_id);
CREATE INDEX IF NOT EXISTS idx_subnational_breakdowns_nationwide ON public.subnational_breakdowns(activity_id, is_nationwide);

-- Enable RLS (Row Level Security)
ALTER TABLE public.subnational_breakdowns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view subnational breakdowns for activities they can access" ON public.subnational_breakdowns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.activities a
            WHERE a.id = subnational_breakdowns.activity_id
            AND (
                a.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = auth.uid()
                    AND ur.role IN ('super_user', 'admin')
                )
            )
        )
    );

CREATE POLICY "Users can insert subnational breakdowns for activities they can edit" ON public.subnational_breakdowns
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.activities a
            WHERE a.id = subnational_breakdowns.activity_id
            AND (
                a.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = auth.uid()
                    AND ur.role IN ('super_user', 'admin')
                )
            )
        )
    );

CREATE POLICY "Users can update subnational breakdowns for activities they can edit" ON public.subnational_breakdowns
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.activities a
            WHERE a.id = subnational_breakdowns.activity_id
            AND (
                a.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = auth.uid()
                    AND ur.role IN ('super_user', 'admin')
                )
            )
        )
    );

CREATE POLICY "Users can delete subnational breakdowns for activities they can edit" ON public.subnational_breakdowns
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.activities a
            WHERE a.id = subnational_breakdowns.activity_id
            AND (
                a.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = auth.uid()
                    AND ur.role IN ('super_user', 'admin')
                )
            )
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subnational_breakdowns_updated_at
    BEFORE UPDATE ON public.subnational_breakdowns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();