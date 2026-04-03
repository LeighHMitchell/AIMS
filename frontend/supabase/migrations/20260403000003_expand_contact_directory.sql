-- ============================================================
-- Migration: Expand contacts table for community directory
-- ============================================================

ALTER TABLE public.contacts
    ADD COLUMN IF NOT EXISTS is_community_contact BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sector_focus TEXT[],
    ADD COLUMN IF NOT EXISTS geographic_focus TEXT[],
    ADD COLUMN IF NOT EXISTS expertise_areas TEXT[],
    ADD COLUMN IF NOT EXISTS contact_frequency TEXT CHECK (contact_frequency IN ('weekly', 'monthly', 'quarterly', 'annually', 'as_needed')),
    ADD COLUMN IF NOT EXISTS working_group_ids UUID[],
    ADD COLUMN IF NOT EXISTS ministry_affiliation TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'left_country'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_is_community_contact ON public.contacts (is_community_contact);
CREATE INDEX IF NOT EXISTS idx_contacts_sector_focus ON public.contacts USING GIN (sector_focus);
CREATE INDEX IF NOT EXISTS idx_contacts_geographic_focus ON public.contacts USING GIN (geographic_focus);
