-- Land Bank: seed dummy parcels
-- Run via Supabase SQL Editor after the land_bank_schema migration
-- Idempotent — checks for existing data before inserting

-- ─────────────────────────────────────────────
-- 0. Ensure missing columns exist
--    (migration only has core columns; types reference these extras)
-- ─────────────────────────────────────────────
ALTER TABLE public.land_parcels ADD COLUMN IF NOT EXISTS asset_type text;
ALTER TABLE public.land_parcels ADD COLUMN IF NOT EXISTS title_status text DEFAULT 'Unregistered';
ALTER TABLE public.land_parcels ADD COLUMN IF NOT EXISTS ndp_goal_id uuid;
ALTER TABLE public.land_parcels ADD COLUMN IF NOT EXISTS secondary_ndp_goals text[] DEFAULT '{}';

DO $$ BEGIN
  ALTER TABLE public.land_parcels ADD COLUMN IF NOT EXISTS controlling_ministry_id uuid;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- 1. Seed parcels (20 realistic Myanmar entries)
--    Only insert if no parcels exist yet
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF (SELECT count(*) FROM public.land_parcels) > 0 THEN
    RAISE NOTICE 'land_parcels already has data — skipping seed';
    RETURN;
  END IF;

  INSERT INTO public.land_parcels (
    parcel_code, name, state_region, township, size_hectares,
    classification, status, asset_type, title_status, notes
  ) VALUES
    -- Yangon (4)
    ('', 'Thilawa Industrial Plot A-12',        'Yangon',     'Thanlyin',       45.00,  'Industrial',            'available',  'Industrial Estate',   'Clear',                'Adjacent to Thilawa SEZ Phase 2. Road-front access, 33kV power supply available.'),
    ('', 'Hlaing Tharyar Logistics Hub',        'Yangon',     'Hlaing Tharyar', 28.50,  'Industrial',            'allocated',  'Warehouse/Depot',     'Clear',                'Cold-chain logistics facility. 5-year lease to MFIL Ltd.'),
    ('', 'Dala Waterfront Mixed-Use Site',      'Yangon',     'Dala',           12.30,  'Mixed-Use',             'available',  'Vacant Land',         'Pending Verification', 'Riverfront site earmarked for transit-oriented development.'),
    ('', 'South Okkalapa Commercial Block',     'Yangon',     'South Okkalapa',  3.20,  'Commercial',            'reserved',   'Office/Commercial',   'Clear',                'Reserved for government office relocation project.'),

    -- Mandalay (3)
    ('', 'Myotha Industrial City Phase 3',      'Mandalay',   'Ngazun',        120.00,  'Special Economic Zone', 'available',  'Industrial Estate',   'Clear',                'Flat terrain, within Myotha Industrial Development. Gas pipeline access.'),
    ('', 'Amarapura Agricultural Station',      'Mandalay',   'Amarapura',      85.00,  'Agricultural',          'allocated',  'Agricultural',        'Clear',                'Irrigated paddy land. Allocated to Dept of Agriculture for seed research.'),
    ('', 'Pyin Oo Lwin Military Transfer',      'Mandalay',   'Pyin Oo Lwin',   35.00,  'Residential',           'disputed',   'Vacant Land',         'Title Disputed',       'Former cantonment area. Ownership dispute between MoD and regional government.'),

    -- Naypyitaw (2)
    ('', 'Naypyitaw Hotel Zone Extension',      'Naypyitaw',  'Ottarathiri',    22.00,  'Commercial',            'available',  'Hotel/Tourism',       'Clear',                'Government-owned hotel zone expansion. Utilities pre-installed.'),
    ('', 'Dekkhinathiri IT Park Plot',          'Naypyitaw',  'Dekkhinathiri',  15.50,  'Industrial',            'reserved',   'Office/Commercial',   'Clear',                'Reserved for Union Government ICT campus. Fiber backbone available.'),

    -- Shan (2)
    ('', 'Taunggyi Hillside Eco-Tourism',       'Shan',       'Taunggyi',       60.00,  'Mixed-Use',             'available',  'Hotel/Tourism',       'Pending Verification', 'Scenic hillside overlooking Inle Lake approach road. Eco-resort potential.'),
    ('', 'Lashio Border Trade Depot',           'Shan',       'Lashio',         18.00,  'Commercial',            'available',  'Warehouse/Depot',     'Clear',                'Near China-Myanmar border trade zone. Bonded warehouse candidate.'),

    -- Sagaing (1)
    ('', 'Monywa Copper Belt Reserve',          'Sagaing',    'Monywa',        200.00,  'Industrial',            'reserved',   'Mining',              'Under Review',         'Within Letpadaung copper concession perimeter. Environmental review pending.'),

    -- Bago (1)
    ('', 'Bago River Basin Irrigation Plot',    'Bago',       'Bago',          150.00,  'Agricultural',          'available',  'Agricultural',        'Clear',                'Flat flood-plain land with canal access. Suitable for commercial rice cultivation.'),

    -- Ayeyarwady (2)
    ('', 'Pathein Fish Processing Zone',        'Ayeyarwady', 'Pathein',        25.00,  'Industrial',            'available',  'Industrial Estate',   'Clear',                'Near Pathein port. Designated for aquaculture processing and cold storage.'),
    ('', 'Labutta Mangrove Buffer',             'Ayeyarwady', 'Labutta',       300.00,  'Agricultural',          'reserved',   'Forest/Conservation', 'Unregistered',         'Mangrove restoration zone. Reserved under climate resilience programme.'),

    -- Mon (1)
    ('', 'Mawlamyine Port Expansion',           'Mon',        'Mawlamyine',     40.00,  'Industrial',            'available',  'Port/Logistics',      'Clear',                'Brownfield reclamation adjacent to existing port. Deep-water berth feasibility study complete.'),

    -- Tanintharyi (1)
    ('', 'Dawei SEZ Phase 1 Block C',           'Tanintharyi','Dawei',          75.00,  'Special Economic Zone', 'available',  'Industrial Estate',   'Clear',                'Part of Dawei SEZ masterplan. Access road and power substation funded by Japan ODA.'),

    -- Kachin (1)
    ('', 'Myitkyina Jade Market Annex',         'Kachin',     'Myitkyina',       5.00,  'Commercial',            'allocated',  'Market/Retail',       'Clear',                'Extension of government jade emporium grounds.'),

    -- Rakhine (1)
    ('', 'Sittwe Deep-Sea Port Hinterland',     'Rakhine',    'Sittwe',         55.00,  'Industrial',            'reserved',   'Port/Logistics',      'Under Review',         'Kaladan Multi-Modal Transit corridor. India-funded infrastructure programme.'),

    -- Kayin (1)
    ('', 'Hpa-An Cement Plant Reserve',         'Kayin',      'Hpa-An',         90.00,  'Industrial',            'available',  'Mining',              'Pending Verification', 'Limestone-rich area near existing quarry. Cement factory feasibility approved.');

  RAISE NOTICE 'Inserted 20 dummy parcels';
END $$;

-- ─────────────────────────────────────────────
-- 2. Verify
-- ─────────────────────────────────────────────
SELECT state_region, status, count(*) FROM land_parcels GROUP BY 1, 2 ORDER BY 1, 2;
