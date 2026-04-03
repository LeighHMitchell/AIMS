-- ============================================================
-- Migration: Enhance calendar_events for coordination features
-- ============================================================

ALTER TABLE public.calendar_events
    ADD COLUMN IF NOT EXISTS sector_tags TEXT[],
    ADD COLUMN IF NOT EXISTS working_group_id UUID REFERENCES public.working_groups(id),
    ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT CHECK (recurrence_pattern IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
    ADD COLUMN IF NOT EXISTS meeting_notes TEXT,
    ADD COLUMN IF NOT EXISTS action_items JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS coordination_level TEXT CHECK (coordination_level IN ('national', 'sub_national', 'cluster', 'working_group', 'bilateral'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_sector_tags ON public.calendar_events USING GIN (sector_tags);
CREATE INDEX IF NOT EXISTS idx_calendar_events_working_group_id ON public.calendar_events (working_group_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_is_public ON public.calendar_events (is_public);
CREATE INDEX IF NOT EXISTS idx_calendar_events_coordination_level ON public.calendar_events (coordination_level);
