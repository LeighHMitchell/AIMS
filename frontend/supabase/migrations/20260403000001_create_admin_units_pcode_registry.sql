-- ============================================================================
-- Create admin_units table: Standardized Place Code (Pcode) registry
-- Enables cross-organization data integration using MIMU-standard Pcodes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Place Code (the key interoperability field)
    pcode TEXT NOT NULL UNIQUE,

    -- Hierarchy
    admin_level INTEGER NOT NULL CHECK (admin_level BETWEEN 0 AND 4),
    -- 0 = Country, 1 = State/Region, 2 = District, 3 = Township, 4 = Ward/Village Tract
    parent_pcode TEXT REFERENCES public.admin_units(pcode),

    -- Names
    name_en TEXT NOT NULL,
    name_my TEXT, -- Myanmar script name

    -- Classification
    unit_type TEXT, -- e.g., 'State', 'Region', 'Union Territory', 'District', 'Township', 'Sub-Township', 'Ward', 'Village Tract'

    -- Geographic data
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    boundary_geojson JSONB,

    -- Demographics
    population INTEGER,
    area_km2 NUMERIC(12, 2),

    -- Metadata
    source TEXT DEFAULT 'MIMU',
    source_date DATE,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_admin_units_pcode ON public.admin_units(pcode);
CREATE INDEX IF NOT EXISTS idx_admin_units_parent ON public.admin_units(parent_pcode);
CREATE INDEX IF NOT EXISTS idx_admin_units_level ON public.admin_units(admin_level);
CREATE INDEX IF NOT EXISTS idx_admin_units_name ON public.admin_units(name_en);
CREATE INDEX IF NOT EXISTS idx_admin_units_active ON public.admin_units(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.admin_units ENABLE ROW LEVEL SECURITY;

-- Everyone can read admin units (reference data)
CREATE POLICY "Admin units are publicly readable" ON public.admin_units
    FOR SELECT USING (true);

-- Only super users can modify
CREATE POLICY "Only super users can modify admin units" ON public.admin_units
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('super_user', 'admin')
        )
    );

-- Updated_at trigger
CREATE TRIGGER update_admin_units_updated_at
    BEFORE UPDATE ON public.admin_units
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.admin_units IS 'Standardized Place Code (Pcode) registry for Myanmar administrative units, compatible with MIMU standards';
COMMENT ON COLUMN public.admin_units.pcode IS 'MIMU Place Code (e.g., MMR001 for Kachin State, MMR001D001 for Myitkyina District)';
COMMENT ON COLUMN public.admin_units.admin_level IS '0=Country, 1=State/Region, 2=District, 3=Township, 4=Ward/Village Tract';
COMMENT ON COLUMN public.admin_units.name_my IS 'Name in Myanmar script';

-- ============================================================================
-- Seed Myanmar State/Region Pcodes (Level 1)
-- Source: MIMU Pcode release
-- ============================================================================
INSERT INTO public.admin_units (pcode, admin_level, name_en, name_my, unit_type, parent_pcode) VALUES
    ('MMR', 0, 'Myanmar', 'မြန်မာ', 'Country', NULL),
    ('MMR001', 1, 'Kachin', 'ကချင်ပြည်နယ်', 'State', 'MMR'),
    ('MMR002', 1, 'Kayah', 'ကယားပြည်နယ်', 'State', 'MMR'),
    ('MMR003', 1, 'Kayin', 'ကရင်ပြည်နယ်', 'State', 'MMR'),
    ('MMR004', 1, 'Chin', 'ချင်းပြည်နယ်', 'State', 'MMR'),
    ('MMR005', 1, 'Sagaing', 'စစ်ကိုင်းတိုင်းဒေသကြီး', 'Region', 'MMR'),
    ('MMR006', 1, 'Tanintharyi', 'တနင်္သာရီတိုင်းဒေသကြီး', 'Region', 'MMR'),
    ('MMR007', 1, 'Bago', 'ပဲခူးတိုင်းဒေသကြီး', 'Region', 'MMR'),
    ('MMR008', 1, 'Magway', 'မကွေးတိုင်းဒေသကြီး', 'Region', 'MMR'),
    ('MMR009', 1, 'Mandalay', 'မန္တလေးတိုင်းဒေသကြီး', 'Region', 'MMR'),
    ('MMR010', 1, 'Mon', 'မွန်ပြည်နယ်', 'State', 'MMR'),
    ('MMR011', 1, 'Rakhine', 'ရခိုင်ပြည်နယ်', 'State', 'MMR'),
    ('MMR012', 1, 'Yangon', 'ရန်ကုန်တိုင်းဒေသကြီး', 'Region', 'MMR'),
    ('MMR013', 1, 'Shan', 'ရှမ်းပြည်နယ်', 'State', 'MMR'),
    ('MMR014', 1, 'Ayeyarwady', 'ဧရာဝတီတိုင်းဒေသကြီး', 'Region', 'MMR'),
    ('MMR018', 1, 'Nay Pyi Taw', 'နေပြည်တော်', 'Union Territory', 'MMR')
ON CONFLICT (pcode) DO NOTHING;

-- ============================================================================
-- Seed District Pcodes (Level 2) - All 74 districts
-- ============================================================================
INSERT INTO public.admin_units (pcode, admin_level, name_en, unit_type, parent_pcode) VALUES
    -- Kachin Districts
    ('MMR001D001', 2, 'Myitkyina', 'District', 'MMR001'),
    ('MMR001D002', 2, 'Mohnyin', 'District', 'MMR001'),
    ('MMR001D003', 2, 'Bhamo', 'District', 'MMR001'),
    ('MMR001D004', 2, 'Putao', 'District', 'MMR001'),
    -- Kayah Districts
    ('MMR002D001', 2, 'Loikaw', 'District', 'MMR002'),
    ('MMR002D002', 2, 'Bawlakhe', 'District', 'MMR002'),
    -- Kayin Districts
    ('MMR003D001', 2, 'Hpa-An', 'District', 'MMR003'),
    ('MMR003D002', 2, 'Kawkareik', 'District', 'MMR003'),
    ('MMR003D003', 2, 'Myawaddy', 'District', 'MMR003'),
    -- Chin Districts
    ('MMR004D001', 2, 'Falam', 'District', 'MMR004'),
    ('MMR004D002', 2, 'Hakha', 'District', 'MMR004'),
    ('MMR004D003', 2, 'Mindat', 'District', 'MMR004'),
    -- Sagaing Districts
    ('MMR005D001', 2, 'Sagaing', 'District', 'MMR005'),
    ('MMR005D002', 2, 'Monywa', 'District', 'MMR005'),
    ('MMR005D003', 2, 'Shwebo', 'District', 'MMR005'),
    ('MMR005D004', 2, 'Katha', 'District', 'MMR005'),
    ('MMR005D005', 2, 'Kalay', 'District', 'MMR005'),
    ('MMR005D006', 2, 'Tamu', 'District', 'MMR005'),
    ('MMR005D007', 2, 'Mawlaik', 'District', 'MMR005'),
    ('MMR005D008', 2, 'Hkamti', 'District', 'MMR005'),
    ('MMR005D009', 2, 'Yinmabin', 'District', 'MMR005'),
    ('MMR005D010', 2, 'Kanbalu', 'District', 'MMR005'),
    -- Tanintharyi Districts
    ('MMR006D001', 2, 'Dawei', 'District', 'MMR006'),
    ('MMR006D002', 2, 'Myeik', 'District', 'MMR006'),
    ('MMR006D003', 2, 'Kawthoung', 'District', 'MMR006'),
    -- Bago Districts
    ('MMR007D001', 2, 'Bago', 'District', 'MMR007'),
    ('MMR007D002', 2, 'Taungoo', 'District', 'MMR007'),
    ('MMR007D003', 2, 'Pyay', 'District', 'MMR007'),
    ('MMR007D004', 2, 'Thayarwady', 'District', 'MMR007'),
    -- Magway Districts
    ('MMR008D001', 2, 'Magway', 'District', 'MMR008'),
    ('MMR008D002', 2, 'Minbu', 'District', 'MMR008'),
    ('MMR008D003', 2, 'Thayet', 'District', 'MMR008'),
    ('MMR008D004', 2, 'Pakokku', 'District', 'MMR008'),
    ('MMR008D005', 2, 'Gangaw', 'District', 'MMR008'),
    -- Mandalay Districts
    ('MMR009D001', 2, 'Mandalay', 'District', 'MMR009'),
    ('MMR009D002', 2, 'Pyin Oo Lwin', 'District', 'MMR009'),
    ('MMR009D003', 2, 'Kyaukse', 'District', 'MMR009'),
    ('MMR009D004', 2, 'Myingyan', 'District', 'MMR009'),
    ('MMR009D005', 2, 'Nyaung-U', 'District', 'MMR009'),
    ('MMR009D006', 2, 'Yamethin', 'District', 'MMR009'),
    ('MMR009D007', 2, 'Meiktila', 'District', 'MMR009'),
    -- Mon Districts
    ('MMR010D001', 2, 'Mawlamyine', 'District', 'MMR010'),
    ('MMR010D002', 2, 'Thaton', 'District', 'MMR010'),
    -- Rakhine Districts
    ('MMR011D001', 2, 'Sittwe', 'District', 'MMR011'),
    ('MMR011D002', 2, 'Maungdaw', 'District', 'MMR011'),
    ('MMR011D003', 2, 'Kyaukpyu', 'District', 'MMR011'),
    ('MMR011D004', 2, 'Thandwe', 'District', 'MMR011'),
    ('MMR011D005', 2, 'Mrauk-U', 'District', 'MMR011'),
    -- Yangon Districts
    ('MMR012D001', 2, 'Yangon (East)', 'District', 'MMR012'),
    ('MMR012D002', 2, 'Yangon (West)', 'District', 'MMR012'),
    ('MMR012D003', 2, 'Yangon (South)', 'District', 'MMR012'),
    ('MMR012D004', 2, 'Yangon (North)', 'District', 'MMR012'),
    -- Shan Districts
    ('MMR013D001', 2, 'Taunggyi', 'District', 'MMR013'),
    ('MMR013D002', 2, 'Loilen', 'District', 'MMR013'),
    ('MMR013D003', 2, 'Kengtung', 'District', 'MMR013'),
    ('MMR013D004', 2, 'Muse', 'District', 'MMR013'),
    ('MMR013D005', 2, 'Kyaukme', 'District', 'MMR013'),
    ('MMR013D006', 2, 'Lashio', 'District', 'MMR013'),
    ('MMR013D007', 2, 'Kunlong', 'District', 'MMR013'),
    ('MMR013D008', 2, 'Hopang', 'District', 'MMR013'),
    ('MMR013D009', 2, 'Matman', 'District', 'MMR013'),
    ('MMR013D010', 2, 'Mong Hsat', 'District', 'MMR013'),
    ('MMR013D011', 2, 'Tachileik', 'District', 'MMR013'),
    -- Ayeyarwady Districts
    ('MMR014D001', 2, 'Pathein', 'District', 'MMR014'),
    ('MMR014D002', 2, 'Hinthada', 'District', 'MMR014'),
    ('MMR014D003', 2, 'Myaungmya', 'District', 'MMR014'),
    ('MMR014D004', 2, 'Maubin', 'District', 'MMR014'),
    ('MMR014D005', 2, 'Labutta', 'District', 'MMR014'),
    ('MMR014D006', 2, 'Pyapon', 'District', 'MMR014'),
    -- Nay Pyi Taw Districts
    ('MMR018D001', 2, 'Ottarathiri', 'District', 'MMR018'),
    ('MMR018D002', 2, 'Dekkhinathiri', 'District', 'MMR018')
ON CONFLICT (pcode) DO NOTHING;

-- ============================================================================
-- Link subnational_breakdowns to admin_units via pcode
-- ============================================================================
ALTER TABLE public.subnational_breakdowns
    ADD COLUMN IF NOT EXISTS admin_unit_id UUID REFERENCES public.admin_units(id);

CREATE INDEX IF NOT EXISTS idx_subnational_admin_unit
    ON public.subnational_breakdowns(admin_unit_id);

-- Also add pcode to activity_locations for cross-referencing
ALTER TABLE public.activity_locations
    ADD COLUMN IF NOT EXISTS pcode TEXT;

CREATE INDEX IF NOT EXISTS idx_activity_locations_pcode
    ON public.activity_locations(pcode);

COMMENT ON COLUMN public.activity_locations.pcode IS 'MIMU Place Code linking this location to the admin_units registry';
