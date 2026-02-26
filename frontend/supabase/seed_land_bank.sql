-- Seed Data for Land Bank module
-- Run this in Supabase SQL Editor after the migration

-- Use the first available user as created_by, and first org for allocations
DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_org_id_2 uuid;
  v_parcel_id uuid;
BEGIN
  -- Get a user to act as creator
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  -- Get two organizations for allocation scenarios
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  SELECT id INTO v_org_id_2 FROM public.organizations OFFSET 1 LIMIT 1;

  -- If no org_id_2, reuse org_id
  IF v_org_id_2 IS NULL THEN v_org_id_2 := v_org_id; END IF;

  -- =============================================
  -- PARCEL 1: Available, Industrial, Yangon
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES ('YGN-0001', 'Thilawa SEZ Plot A', 'Yangon', 'Thanlyin', 250.00, 'Special Economic Zone', 'available',
    'Prime industrial plot within Thilawa SEZ Phase 2. Fully serviced with road access, water, and power connections.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- PARCEL 2: Available, Agricultural, Ayeyarwady
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES ('AYW-0001', 'Pathein Delta Agri-Zone', 'Ayeyarwady', 'Pathein', 1200.50, 'Agricultural',  'available',
    'Large delta flatland suitable for commercial rice cultivation or aquaculture development.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- PARCEL 3: Allocated, Commercial, Mandalay
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, allocated_to, lease_start_date, lease_end_date, notes, created_by)
  VALUES ('MDY-0001', 'Mandalay Central Business District Lot 7', 'Mandalay', 'Chanayethazan', 12.30, 'Commercial', 'allocated',
    v_org_id, '2025-01-01', '2030-12-31',
    'City-center commercial lot allocated for mixed-use office and retail development.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- PARCEL 4: Reserved, Industrial, Sagaing
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES ('SGG-0001', 'Monywa Industrial Park Site B', 'Sagaing', 'Monywa', 85.00, 'Industrial', 'reserved',
    'Reserved pending allocation review. Adjacent to existing copper mining support facilities.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- PARCEL 5: Available, Residential, Naypyitaw
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES ('NPT-0001', 'Naypyitaw Zone 8 Housing Block', 'Naypyitaw', 'Ottarathiri', 45.00, 'Residential', 'available',
    'Government housing development zone. Flat terrain with existing utility corridors nearby.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- PARCEL 6: Disputed, Mixed-Use, Yangon
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES ('YGN-0002', 'Hlaing Tharyar Waterfront Development', 'Yangon', 'Hlaing Tharyar', 35.50, 'Mixed-Use', 'disputed',
    'Waterfront parcel with competing allocation requests from two development partners.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- PARCEL 7: Available, Agricultural, Shan
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES ('SHN-0001', 'Inle Lake Eco-Agriculture Zone', 'Shan', 'Nyaungshwe', 300.00, 'Agricultural', 'available',
    'Highland agricultural zone suitable for organic farming and agri-tourism development.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- PARCEL 8: Allocated, Industrial, Bago
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, allocated_to, lease_start_date, lease_end_date, notes, created_by)
  VALUES ('BGO-0001', 'Bago Industrial Corridor Plot 3', 'Bago', 'Bago', 150.00, 'Industrial', 'allocated',
    v_org_id_2, '2024-06-01', '2029-05-31',
    'Light manufacturing zone along the Yangon-Mandalay expressway corridor.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- PARCEL 9: Available, Commercial, Yangon
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES ('YGN-0003', 'Dagon Seikkan New Town Commercial Area', 'Yangon', 'Dagon Seikkan', 22.00, 'Commercial', 'available',
    'Emerging commercial district with planned transport links to downtown Yangon.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- PARCEL 10: Available, Special Economic Zone, Mon
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES ('MON-0001', 'Dawei SEZ Phase 1 Area', 'Mon', 'Ye', 500.00, 'Special Economic Zone', 'available',
    'Part of the Dawei Special Economic Zone deep-sea port and industrial complex.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- PARCEL 11: Reserved, Residential, Mandalay
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES ('MDY-0002', 'Amarapura Affordable Housing Site', 'Mandalay', 'Amarapura', 60.00, 'Residential', 'reserved',
    'Identified for government-subsidized affordable housing program.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- PARCEL 12: Available, Agricultural, Magway
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES ('MGW-0001', 'Magway Dry Zone Irrigation Parcel', 'Magway', 'Magway', 800.00, 'Agricultural', 'available',
    'Large parcel in central dry zone. Requires irrigation investment for productive agriculture.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- PARCEL 13: Available, Industrial, Tanintharyi
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES ('TNT-0001', 'Myeik Fisheries Processing Zone', 'Tanintharyi', 'Myeik', 40.00, 'Industrial', 'available',
    'Coastal industrial lot for seafood processing and cold chain facilities.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- PARCEL 14: Allocated, Mixed-Use, Yangon (lease expiring soon)
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, allocated_to, lease_start_date, lease_end_date, notes, created_by)
  VALUES ('YGN-0004', 'Mingaladon Tech Park Expansion', 'Yangon', 'Mingaladon', 75.00, 'Mixed-Use', 'allocated',
    v_org_id, '2023-04-01', '2026-03-15',
    'Technology park expansion zone. Lease expiring soon — renewal under discussion.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- PARCEL 15: Available, Commercial, Kachin
  -- =============================================
  INSERT INTO public.land_parcels (parcel_code, name, state_region, township, size_hectares, classification, status, notes, created_by)
  VALUES ('KCN-0001', 'Myitkyina Border Trade Zone', 'Kachin', 'Myitkyina', 30.00, 'Commercial', 'available',
    'Cross-border trade facilitation zone near the China-Myanmar border.', v_user_id)
  ON CONFLICT (parcel_code) DO NOTHING;

  -- =============================================
  -- HISTORY ENTRIES for allocated/disputed parcels
  -- =============================================

  -- History for MDY-0001 (allocated)
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'MDY-0001';
  IF v_parcel_id IS NOT NULL THEN
    INSERT INTO public.land_parcel_history (parcel_id, action, details, performed_by)
    VALUES
      (v_parcel_id, 'created', '{"name": "Mandalay Central Business District Lot 7"}'::jsonb, v_user_id),
      (v_parcel_id, 'allocation_requested', jsonb_build_object('organization_id', v_org_id), v_user_id),
      (v_parcel_id, 'allocation_approved', jsonb_build_object('organization_id', v_org_id), v_user_id);
  END IF;

  -- History for YGN-0002 (disputed)
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'YGN-0002';
  IF v_parcel_id IS NOT NULL THEN
    INSERT INTO public.land_parcel_history (parcel_id, action, details, performed_by)
    VALUES
      (v_parcel_id, 'created', '{"name": "Hlaing Tharyar Waterfront Development"}'::jsonb, v_user_id),
      (v_parcel_id, 'allocation_requested', jsonb_build_object('organization_id', v_org_id), v_user_id),
      (v_parcel_id, 'allocation_requested', jsonb_build_object('organization_id', v_org_id_2), v_user_id),
      (v_parcel_id, 'disputed', '{"reason": "Multiple pending allocation requests", "pending_count": 2}'::jsonb, v_user_id);
  END IF;

  -- History for BGO-0001 (allocated)
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'BGO-0001';
  IF v_parcel_id IS NOT NULL THEN
    INSERT INTO public.land_parcel_history (parcel_id, action, details, performed_by)
    VALUES
      (v_parcel_id, 'created', '{"name": "Bago Industrial Corridor Plot 3"}'::jsonb, v_user_id),
      (v_parcel_id, 'allocation_approved', jsonb_build_object('organization_id', v_org_id_2), v_user_id);
  END IF;

  -- History for YGN-0004 (allocated, expiring)
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'YGN-0004';
  IF v_parcel_id IS NOT NULL THEN
    INSERT INTO public.land_parcel_history (parcel_id, action, details, performed_by)
    VALUES
      (v_parcel_id, 'created', '{"name": "Mingaladon Tech Park Expansion"}'::jsonb, v_user_id),
      (v_parcel_id, 'allocation_approved', jsonb_build_object('organization_id', v_org_id), v_user_id);
  END IF;

  -- =============================================
  -- ALLOCATION REQUESTS for disputed parcel YGN-0002
  -- =============================================
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'YGN-0002';
  IF v_parcel_id IS NOT NULL AND v_org_id IS NOT NULL THEN
    INSERT INTO public.allocation_requests (parcel_id, organization_id, requested_by, status, purpose, proposed_start_date, proposed_end_date)
    VALUES
      (v_parcel_id, v_org_id, v_user_id, 'pending',
       'Mixed-use waterfront development including office towers, retail, and public green space.',
       '2026-06-01', '2036-05-31'),
      (v_parcel_id, v_org_id_2, v_user_id, 'pending',
       'Logistics hub and warehouse complex to support Yangon port operations.',
       '2026-07-01', '2031-06-30');
  END IF;

  -- =============================================
  -- ALLOCATION REQUEST for reserved parcel SGG-0001
  -- =============================================
  SELECT id INTO v_parcel_id FROM public.land_parcels WHERE parcel_code = 'SGG-0001';
  IF v_parcel_id IS NOT NULL AND v_org_id IS NOT NULL THEN
    INSERT INTO public.allocation_requests (parcel_id, organization_id, requested_by, status, purpose, proposed_start_date, proposed_end_date)
    VALUES
      (v_parcel_id, v_org_id, v_user_id, 'pending',
       'Expansion of copper processing and refining facilities adjacent to existing Monywa operations.',
       '2026-03-01', '2031-02-28');
  END IF;

  RAISE NOTICE 'Land Bank seed data inserted successfully: 15 parcels, history entries, and allocation requests.';
END $$;
