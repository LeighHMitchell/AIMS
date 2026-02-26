-- Land Bank v2 seed data
-- Replaces seed_land_bank.sql + seed_land_bank_geometry.sql
-- Adds: realistic polygon geometry (non-rectangular), richer allocation history,
-- scored allocation requests, more status variety across regions, and
-- two new classifications (Conservation, Infrastructure).
--
-- Run in Supabase SQL Editor AFTER the land_bank_schema migration.

-- ─── 0. Additional classifications ─────────────────────────────────────────────
INSERT INTO public.land_parcel_classifications (name, description, display_order)
VALUES
  ('Conservation', 'Land set aside for environmental protection, forestry, or wildlife habitat', 7),
  ('Infrastructure', 'Land reserved for roads, bridges, utilities, and public infrastructure projects', 8)
ON CONFLICT (name) DO NOTHING;

-- ─── Main seed block ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_org_id_2 uuid;
  v_org_id_3 uuid;
  v_parcel_id uuid;
BEGIN
  -- Grab a user + up to 3 orgs for realistic allocation scenarios
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  SELECT id INTO v_org_id   FROM public.organizations LIMIT 1;
  SELECT id INTO v_org_id_2 FROM public.organizations OFFSET 1 LIMIT 1;
  SELECT id INTO v_org_id_3 FROM public.organizations OFFSET 2 LIMIT 1;
  IF v_org_id_2 IS NULL THEN v_org_id_2 := v_org_id; END IF;
  IF v_org_id_3 IS NULL THEN v_org_id_3 := v_org_id; END IF;

  -- =========================================================================
  -- PARCEL 1 — Available, SEZ, Yangon (irregular pentagon — Thilawa)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('YGN-0001', 'Thilawa SEZ Plot A', 'Yangon', 'Thanlyin', 250.00, 'Special Economic Zone', 'available',
     'Prime industrial plot within Thilawa SEZ Phase 2. Fully serviced with road access, water, and power connections.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[96.2450,16.6350],[96.2580,16.6380],[96.2650,16.6300],[96.2600,16.6200],[96.2450,16.6220],[96.2450,16.6350]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry,
    notes = EXCLUDED.notes;

  -- =========================================================================
  -- PARCEL 2 — Available, Agricultural, Ayeyarwady (L-shaped polygon)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('AYW-0001', 'Pathein Delta Agri-Zone', 'Ayeyarwady', 'Pathein', 1200.50, 'Agricultural', 'available',
     'Large delta flatland suitable for commercial rice cultivation or aquaculture development.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[94.7200,16.7900],[94.7500,16.7900],[94.7500,16.7600],[94.7800,16.7600],[94.7800,16.7300],[94.7200,16.7300],[94.7200,16.7900]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry;

  -- =========================================================================
  -- PARCEL 3 — Allocated, Commercial, Mandalay (hexagon — CBD lot)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status,
     allocated_to, lease_start_date, lease_end_date, notes, created_by, geometry)
  VALUES
    ('MDY-0001', 'Mandalay Central Business District Lot 7', 'Mandalay', 'Chanayethazan', 12.30, 'Commercial', 'allocated',
     v_org_id, '2025-01-01', '2030-12-31',
     'City-center commercial lot allocated for mixed-use office and retail development.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[96.0800,21.9720],[96.0830,21.9725],[96.0850,21.9710],[96.0850,21.9695],[96.0820,21.9690],[96.0800,21.9700],[96.0800,21.9720]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry,
    allocated_to = EXCLUDED.allocated_to,
    lease_start_date = EXCLUDED.lease_start_date,
    lease_end_date = EXCLUDED.lease_end_date,
    status = EXCLUDED.status;

  -- =========================================================================
  -- PARCEL 4 — Reserved, Industrial, Sagaing (trapezoid)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('SGG-0001', 'Monywa Industrial Park Site B', 'Sagaing', 'Monywa', 85.00, 'Industrial', 'reserved',
     'Reserved pending allocation review. Adjacent to existing copper mining support facilities.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[95.1220,21.9250],[95.1330,21.9250],[95.1350,21.9150],[95.1200,21.9150],[95.1220,21.9250]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry;

  -- =========================================================================
  -- PARCEL 5 — Available, Residential, Naypyitaw (irregular quad)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('NPT-0001', 'Naypyitaw Zone 8 Housing Block', 'Naypyitaw', 'Ottarathiri', 45.00, 'Residential', 'available',
     'Government housing development zone. Flat terrain with existing utility corridors nearby.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[96.1500,19.7800],[96.1570,19.7810],[96.1600,19.7730],[96.1510,19.7720],[96.1500,19.7800]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry;

  -- =========================================================================
  -- PARCEL 6 — Disputed, Mixed-Use, Yangon (triangle — waterfront)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('YGN-0002', 'Hlaing Tharyar Waterfront Development', 'Yangon', 'Hlaing Tharyar', 35.50, 'Mixed-Use', 'disputed',
     'Waterfront parcel with competing allocation requests from two development partners.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[96.0650,16.8950],[96.0750,16.8920],[96.0700,16.8880],[96.0650,16.8950]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry;

  -- =========================================================================
  -- PARCEL 7 — Available, Agricultural, Shan (irregular pentagon near Inle)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('SHN-0001', 'Inle Lake Eco-Agriculture Zone', 'Shan', 'Nyaungshwe', 300.00, 'Agricultural', 'available',
     'Highland agricultural zone suitable for organic farming and agri-tourism development.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[96.9100,20.4700],[96.9280,20.4720],[96.9400,20.4600],[96.9350,20.4450],[96.9100,20.4480],[96.9100,20.4700]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry;

  -- =========================================================================
  -- PARCEL 8 — Allocated, Industrial, Bago (parallelogram along expressway)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status,
     allocated_to, lease_start_date, lease_end_date, notes, created_by, geometry)
  VALUES
    ('BGO-0001', 'Bago Industrial Corridor Plot 3', 'Bago', 'Bago', 150.00, 'Industrial', 'allocated',
     v_org_id_2, '2024-06-01', '2029-05-31',
     'Light manufacturing zone along the Yangon-Mandalay expressway corridor.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[96.4700,17.3450],[96.4900,17.3470],[96.4920,17.3310],[96.4720,17.3300],[96.4700,17.3450]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry,
    allocated_to = EXCLUDED.allocated_to,
    lease_start_date = EXCLUDED.lease_start_date,
    lease_end_date = EXCLUDED.lease_end_date,
    status = EXCLUDED.status;

  -- =========================================================================
  -- PARCEL 9 — Available, Commercial, Yangon (Dagon Seikkan)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('YGN-0003', 'Dagon Seikkan New Town Commercial Area', 'Yangon', 'Dagon Seikkan', 22.00, 'Commercial', 'available',
     'Emerging commercial district with planned transport links to downtown Yangon.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[96.2700,16.8650],[96.2760,16.8660],[96.2780,16.8610],[96.2730,16.8590],[96.2700,16.8600],[96.2700,16.8650]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry;

  -- =========================================================================
  -- PARCEL 10 — Available, SEZ, Mon (large irregular polygon — Dawei)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('MON-0001', 'Dawei SEZ Phase 1 Area', 'Mon', 'Ye', 500.00, 'Special Economic Zone', 'available',
     'Part of the Dawei Special Economic Zone deep-sea port and industrial complex.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[98.0600,14.0900],[98.0820,14.0920],[98.1000,14.0800],[98.0950,14.0550],[98.0650,14.0580],[98.0600,14.0900]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry;

  -- =========================================================================
  -- PARCEL 11 — Reserved, Residential, Mandalay (Amarapura)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('MDY-0002', 'Amarapura Affordable Housing Site', 'Mandalay', 'Amarapura', 60.00, 'Residential', 'reserved',
     'Identified for government-subsidized affordable housing program.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[96.0550,21.8950],[96.0620,21.8960],[96.0650,21.8900],[96.0590,21.8870],[96.0550,21.8890],[96.0550,21.8950]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry;

  -- =========================================================================
  -- PARCEL 12 — Available, Agricultural, Magway (large rectangle — dry zone)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('MGW-0001', 'Magway Dry Zone Irrigation Parcel', 'Magway', 'Magway', 800.00, 'Agricultural', 'available',
     'Large parcel in central dry zone. Requires irrigation investment for productive agriculture.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[94.9100,20.1700],[94.9400,20.1720],[94.9600,20.1500],[94.9500,20.1200],[94.9100,20.1250],[94.9100,20.1700]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry;

  -- =========================================================================
  -- PARCEL 13 — Available, Industrial, Tanintharyi (coastal, Myeik)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('TNT-0001', 'Myeik Fisheries Processing Zone', 'Tanintharyi', 'Myeik', 40.00, 'Industrial', 'available',
     'Coastal industrial lot for seafood processing and cold chain facilities.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[98.5950,12.4450],[98.6030,12.4460],[98.6050,12.4400],[98.5980,12.4380],[98.5950,12.4450]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry;

  -- =========================================================================
  -- PARCEL 14 — Allocated, Mixed-Use, Yangon (lease expiring soon)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status,
     allocated_to, lease_start_date, lease_end_date, notes, created_by, geometry)
  VALUES
    ('YGN-0004', 'Mingaladon Tech Park Expansion', 'Yangon', 'Mingaladon', 75.00, 'Mixed-Use', 'allocated',
     v_org_id, '2023-04-01', '2026-03-15',
     'Technology park expansion zone. Lease expiring soon — renewal under discussion.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[96.1650,16.9350],[96.1730,16.9370],[96.1780,16.9300],[96.1720,16.9250],[96.1650,16.9270],[96.1650,16.9350]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry,
    allocated_to = EXCLUDED.allocated_to,
    lease_start_date = EXCLUDED.lease_start_date,
    lease_end_date = EXCLUDED.lease_end_date,
    status = EXCLUDED.status;

  -- =========================================================================
  -- PARCEL 15 — Available, Commercial, Kachin (border trade)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('KCN-0001', 'Myitkyina Border Trade Zone', 'Kachin', 'Myitkyina', 30.00, 'Commercial', 'available',
     'Cross-border trade facilitation zone near the China-Myanmar border.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[97.3900,25.3950],[97.3960,25.3960],[97.4000,25.3910],[97.3970,25.3880],[97.3900,25.3890],[97.3900,25.3950]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO UPDATE SET
    geometry = EXCLUDED.geometry;

  -- =========================================================================
  -- PARCEL 16 — NEW: Available, Conservation, Chin (highland forest)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('CHN-0001', 'Nat Ma Taung Forest Reserve Buffer', 'Chin', 'Kanpetlet', 420.00, 'Conservation', 'available',
     'Buffer zone adjacent to Nat Ma Taung (Mt. Victoria) National Park. Designated for reforestation and eco-tourism.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[93.9700,21.2200],[93.9850,21.2250],[93.9950,21.2150],[93.9900,21.2050],[93.9750,21.2020],[93.9700,21.2200]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =========================================================================
  -- PARCEL 17 — NEW: Reserved, Infrastructure, Kayin (bridge corridor)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('KYN-0001', 'Hpa-An River Bridge Approach Corridor', 'Kayin', 'Hpa-An', 18.50, 'Infrastructure', 'reserved',
     'Right-of-way corridor for the planned second Thanlwin (Salween) River bridge. Land reserved for road approaches and toll facilities.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[97.6300,16.8900],[97.6450,16.8910],[97.6460,16.8860],[97.6310,16.8850],[97.6300,16.8900]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =========================================================================
  -- PARCEL 18 — NEW: Available, Agricultural, Kayah (highland)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('KYH-0001', 'Loikaw Highland Coffee Plantation Zone', 'Kayah', 'Loikaw', 95.00, 'Agricultural', 'available',
     'High-altitude zone suitable for specialty coffee and avocado cultivation. Good road access from Loikaw town.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[97.2050,19.6850],[97.2180,19.6870],[97.2200,19.6770],[97.2100,19.6750],[97.2050,19.6790],[97.2050,19.6850]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =========================================================================
  -- PARCEL 19 — NEW: Available, Conservation, Rakhine (mangrove)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('RKN-0001', 'Mrauk U Mangrove Conservation Area', 'Rakhine', 'Mrauk U', 680.00, 'Conservation', 'available',
     'Coastal mangrove belt critical for fisheries nurseries and cyclone protection. Proposed for community-managed conservation.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[93.1800,20.6050],[93.2100,20.6100],[93.2200,20.5900],[93.2050,20.5750],[93.1850,20.5800],[93.1800,20.6050]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =========================================================================
  -- PARCEL 20 — NEW: Disputed, Infrastructure, Yangon (ring road)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('YGN-0005', 'Outer Ring Road Section 4 ROW', 'Yangon', 'Shwepyithar', 55.00, 'Infrastructure', 'disputed',
     'Road right-of-way for the proposed Yangon Outer Ring Road. Multiple land ownership claims under review.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[96.0400,17.0100],[96.0600,17.0120],[96.0620,17.0050],[96.0420,17.0030],[96.0400,17.0100]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =========================================================================
  -- PARCEL 21 — NEW: Allocated, Residential, Sagaing (satellite town)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status,
     allocated_to, lease_start_date, lease_end_date, notes, created_by, geometry)
  VALUES
    ('SGG-0002', 'Sagaing New Satellite Town Phase 1', 'Sagaing', 'Sagaing', 180.00, 'Residential', 'allocated',
     v_org_id_3, '2025-06-01', '2035-05-31',
     'Master-planned satellite township with 2,500 housing units, school, and community facilities.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[95.9700,21.8850],[95.9900,21.8880],[95.9950,21.8750],[95.9800,21.8700],[95.9700,21.8720],[95.9700,21.8850]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =========================================================================
  -- PARCEL 22 — NEW: Available, Industrial, Mandalay (no geometry — tests wizard)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES
    ('MDY-0003', 'Myotha Industrial Zone Plot 12', 'Mandalay', 'Ngazun', 110.00, 'Industrial', 'available',
     'Plot within the Myotha Industrial Development zone. Boundary survey pending — geometry to be added.',
     v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =========================================================================
  -- PARCEL 23 — NEW: Available, Mixed-Use, Naypyitaw (no geometry — tests wizard)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES
    ('NPT-0002', 'Naypyitaw Hotel Zone Extension', 'Naypyitaw', 'Dekkhinathiri', 28.00, 'Mixed-Use', 'available',
     'Extension of the hotel zone for tourism facilities. Geometry awaiting cadastral survey.',
     v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =========================================================================
  -- PARCEL 24 — NEW: Reserved, Commercial, Shan (border trade)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by, geometry)
  VALUES
    ('SHN-0002', 'Muse Border Trade Logistics Park', 'Shan', 'Muse', 65.00, 'Commercial', 'reserved',
     'Logistics and warehousing park at the Myanmar-China 105 Mile border crossing. Reserved for ASEAN trade facilitation project.',
     v_user_id,
     '{"type":"Polygon","coordinates":[[[97.8500,23.9900],[97.8650,23.9920],[97.8680,23.9830],[97.8550,23.9810],[97.8500,23.9900]]]}'::jsonb)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =========================================================================
  -- PARCEL 25 — NEW: Available, Agricultural, Bago (no geometry)
  -- =========================================================================
  INSERT INTO public.land_parcels
    (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES
    ('BGO-0002', 'Taungoo Teak Agroforestry Concession', 'Bago', 'Taungoo', 550.00, 'Agricultural', 'available',
     'Mixed teak and cash-crop agroforestry parcel in the Bago Yoma foothills. Boundary to be determined after community consultation.',
     v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;


  -- ═══════════════════════════════════════════════════════════════════════════
  -- HISTORY ENTRIES
  -- ═══════════════════════════════════════════════════════════════════════════

  -- MDY-0001 (allocated)
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'MDY-0001';
  IF v_parcel_id IS NOT NULL THEN
    DELETE FROM public.land_parcel_history WHERE parcel_id = v_parcel_id;
    INSERT INTO public.land_parcel_history (parcel_id, action, details, performed_by, created_at) VALUES
      (v_parcel_id, 'created', '{"name":"Mandalay Central Business District Lot 7"}'::jsonb, v_user_id, now() - interval '180 days'),
      (v_parcel_id, 'allocation_requested', jsonb_build_object('organization_id', v_org_id), v_user_id, now() - interval '150 days'),
      (v_parcel_id, 'allocation_approved', jsonb_build_object('organization_id', v_org_id), v_user_id, now() - interval '120 days'),
      (v_parcel_id, 'updated', '{"fields_changed":["notes"]}'::jsonb, v_user_id, now() - interval '30 days');
  END IF;

  -- YGN-0002 (disputed)
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'YGN-0002';
  IF v_parcel_id IS NOT NULL THEN
    DELETE FROM public.land_parcel_history WHERE parcel_id = v_parcel_id;
    INSERT INTO public.land_parcel_history (parcel_id, action, details, performed_by, created_at) VALUES
      (v_parcel_id, 'created', '{"name":"Hlaing Tharyar Waterfront Development"}'::jsonb, v_user_id, now() - interval '90 days'),
      (v_parcel_id, 'allocation_requested', jsonb_build_object('organization_id', v_org_id), v_user_id, now() - interval '60 days'),
      (v_parcel_id, 'allocation_requested', jsonb_build_object('organization_id', v_org_id_2), v_user_id, now() - interval '45 days'),
      (v_parcel_id, 'disputed', '{"reason":"Multiple pending allocation requests","pending_count":2}'::jsonb, v_user_id, now() - interval '44 days'),
      (v_parcel_id, 'updated', '{"fields_changed":["notes","geometry"]}'::jsonb, v_user_id, now() - interval '10 days');
  END IF;

  -- BGO-0001 (allocated)
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'BGO-0001';
  IF v_parcel_id IS NOT NULL THEN
    DELETE FROM public.land_parcel_history WHERE parcel_id = v_parcel_id;
    INSERT INTO public.land_parcel_history (parcel_id, action, details, performed_by, created_at) VALUES
      (v_parcel_id, 'created', '{"name":"Bago Industrial Corridor Plot 3"}'::jsonb, v_user_id, now() - interval '300 days'),
      (v_parcel_id, 'allocation_requested', jsonb_build_object('organization_id', v_org_id_2), v_user_id, now() - interval '270 days'),
      (v_parcel_id, 'allocation_approved', jsonb_build_object('organization_id', v_org_id_2), v_user_id, now() - interval '240 days');
  END IF;

  -- YGN-0004 (allocated, expiring)
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'YGN-0004';
  IF v_parcel_id IS NOT NULL THEN
    DELETE FROM public.land_parcel_history WHERE parcel_id = v_parcel_id;
    INSERT INTO public.land_parcel_history (parcel_id, action, details, performed_by, created_at) VALUES
      (v_parcel_id, 'created', '{"name":"Mingaladon Tech Park Expansion"}'::jsonb, v_user_id, now() - interval '400 days'),
      (v_parcel_id, 'allocation_approved', jsonb_build_object('organization_id', v_org_id), v_user_id, now() - interval '380 days'),
      (v_parcel_id, 'updated', '{"fields_changed":["notes"],"note":"Lease renewal discussion initiated"}'::jsonb, v_user_id, now() - interval '14 days');
  END IF;

  -- SGG-0002 (allocated, new)
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'SGG-0002';
  IF v_parcel_id IS NOT NULL THEN
    DELETE FROM public.land_parcel_history WHERE parcel_id = v_parcel_id;
    INSERT INTO public.land_parcel_history (parcel_id, action, details, performed_by, created_at) VALUES
      (v_parcel_id, 'created', '{"name":"Sagaing New Satellite Town Phase 1"}'::jsonb, v_user_id, now() - interval '60 days'),
      (v_parcel_id, 'allocation_requested', jsonb_build_object('organization_id', v_org_id_3), v_user_id, now() - interval '45 days'),
      (v_parcel_id, 'allocation_approved', jsonb_build_object('organization_id', v_org_id_3), v_user_id, now() - interval '30 days');
  END IF;

  -- YGN-0005 (disputed, new)
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'YGN-0005';
  IF v_parcel_id IS NOT NULL THEN
    DELETE FROM public.land_parcel_history WHERE parcel_id = v_parcel_id;
    INSERT INTO public.land_parcel_history (parcel_id, action, details, performed_by, created_at) VALUES
      (v_parcel_id, 'created', '{"name":"Outer Ring Road Section 4 ROW"}'::jsonb, v_user_id, now() - interval '20 days'),
      (v_parcel_id, 'allocation_requested', jsonb_build_object('organization_id', v_org_id), v_user_id, now() - interval '15 days'),
      (v_parcel_id, 'allocation_requested', jsonb_build_object('organization_id', v_org_id_2), v_user_id, now() - interval '12 days'),
      (v_parcel_id, 'disputed', '{"reason":"Overlapping land title claims require legal review","pending_count":2}'::jsonb, v_user_id, now() - interval '10 days');
  END IF;

  -- History for "created" entries on all other parcels
  FOR v_parcel_id IN
    SELECT id FROM public.land_parcels
    WHERE id NOT IN (
      SELECT DISTINCT parcel_id FROM public.land_parcel_history
    )
  LOOP
    INSERT INTO public.land_parcel_history (parcel_id, action, details, performed_by, created_at)
    SELECT v_parcel_id, 'created',
           jsonb_build_object('name', lp.name),
           v_user_id,
           lp.created_at
    FROM public.land_parcels lp WHERE lp.id = v_parcel_id;
  END LOOP;


  -- ═══════════════════════════════════════════════════════════════════════════
  -- ALLOCATION REQUESTS (with scoring for GeoJSON / CSV export testing)
  -- ═══════════════════════════════════════════════════════════════════════════

  -- YGN-0002 (disputed) — two competing requests with partial scoring
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'YGN-0002';
  IF v_parcel_id IS NOT NULL AND v_org_id IS NOT NULL THEN
    DELETE FROM public.allocation_requests WHERE parcel_id = v_parcel_id;
    INSERT INTO public.allocation_requests
      (parcel_id, organization_id, requested_by, status, purpose,
       proposed_start_date, proposed_end_date,
       priority_score_purpose, priority_score_track_record, priority_score_feasibility,
       reviewer_notes)
    VALUES
      (v_parcel_id, v_org_id, v_user_id, 'pending',
       'Mixed-use waterfront development including office towers, retail, and public green space.',
       '2026-06-01', '2036-05-31',
       4, 5, 3,
       'Strong track record but feasibility concerns around flood risk mitigation costs.'),
      (v_parcel_id, v_org_id_2, v_user_id, 'pending',
       'Logistics hub and warehouse complex to support Yangon port operations.',
       '2026-07-01', '2031-06-30',
       3, 3, 4,
       'Solid logistics plan but shorter lease term and limited community benefit.');
  END IF;

  -- SGG-0001 (reserved) — single pending request with partial scoring
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'SGG-0001';
  IF v_parcel_id IS NOT NULL AND v_org_id IS NOT NULL THEN
    DELETE FROM public.allocation_requests WHERE parcel_id = v_parcel_id;
    INSERT INTO public.allocation_requests
      (parcel_id, organization_id, requested_by, status, purpose,
       proposed_start_date, proposed_end_date,
       priority_score_purpose, priority_score_track_record, priority_score_feasibility,
       reviewer_notes)
    VALUES
      (v_parcel_id, v_org_id, v_user_id, 'pending',
       'Expansion of copper processing and refining facilities adjacent to existing Monywa operations.',
       '2026-03-01', '2031-02-28',
       4, 4, 4,
       'Environmental impact assessment required before final approval.');
  END IF;

  -- YGN-0005 (disputed) — two competing requests, no scoring yet
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'YGN-0005';
  IF v_parcel_id IS NOT NULL AND v_org_id IS NOT NULL THEN
    DELETE FROM public.allocation_requests WHERE parcel_id = v_parcel_id;
    INSERT INTO public.allocation_requests
      (parcel_id, organization_id, requested_by, status, purpose,
       proposed_start_date, proposed_end_date)
    VALUES
      (v_parcel_id, v_org_id, v_user_id, 'pending',
       'Public road construction as part of Yangon Outer Ring Road project.',
       '2027-01-01', '2057-12-31'),
      (v_parcel_id, v_org_id_2, v_user_id, 'pending',
       'Private industrial estate development — claims pre-existing land title.',
       '2026-09-01', '2046-08-31');
  END IF;

  -- MDY-0002 (reserved) — single pending request
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'MDY-0002';
  IF v_parcel_id IS NOT NULL AND v_org_id IS NOT NULL THEN
    DELETE FROM public.allocation_requests WHERE parcel_id = v_parcel_id;
    INSERT INTO public.allocation_requests
      (parcel_id, organization_id, requested_by, status, purpose,
       proposed_start_date, proposed_end_date)
    VALUES
      (v_parcel_id, v_org_id_3, v_user_id, 'pending',
       'Government affordable housing project — 500 unit development.',
       '2026-06-01', '2031-05-31');
  END IF;

  -- SHN-0002 (reserved) — single pending request
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'SHN-0002';
  IF v_parcel_id IS NOT NULL AND v_org_id IS NOT NULL THEN
    DELETE FROM public.allocation_requests WHERE parcel_id = v_parcel_id;
    INSERT INTO public.allocation_requests
      (parcel_id, organization_id, requested_by, status, purpose,
       proposed_start_date, proposed_end_date,
       priority_score_purpose, priority_score_track_record, priority_score_feasibility,
       reviewer_notes)
    VALUES
      (v_parcel_id, v_org_id_2, v_user_id, 'pending',
       'ASEAN Cross-Border Trade Facilitation warehouse and cold-chain storage.',
       '2026-10-01', '2036-09-30',
       5, 4, 4,
       'Strong alignment with national trade strategy. Recommended for approval.');
  END IF;

  -- KYN-0001 (reserved) — single pending request
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'KYN-0001';
  IF v_parcel_id IS NOT NULL AND v_org_id IS NOT NULL THEN
    DELETE FROM public.allocation_requests WHERE parcel_id = v_parcel_id;
    INSERT INTO public.allocation_requests
      (parcel_id, organization_id, requested_by, status, purpose,
       proposed_start_date, proposed_end_date)
    VALUES
      (v_parcel_id, v_org_id, v_user_id, 'pending',
       'Bridge approach road and toll plaza construction for Thanlwin River crossing.',
       '2027-04-01', '2057-03-31');
  END IF;

  RAISE NOTICE 'Land Bank v2 seed complete: 25 parcels (22 with geometry, 3 without), history, and allocation requests.';
END $$;
