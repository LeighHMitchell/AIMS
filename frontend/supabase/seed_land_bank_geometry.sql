-- Add geometry data to all 15 land parcels
-- Run in Supabase SQL Editor after the main seed

-- YGN-0001: Thilawa SEZ Plot A (Thanlyin, south Yangon)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[96.2450, 16.6350], [96.2650, 16.6350], [96.2650, 16.6200], [96.2450, 16.6200], [96.2450, 16.6350]]]
}'::jsonb WHERE parcel_code = 'YGN-0001';

-- AYW-0001: Pathein Delta Agri-Zone (Ayeyarwady delta)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[94.7200, 16.7900], [94.7800, 16.7900], [94.7800, 16.7300], [94.7200, 16.7300], [94.7200, 16.7900]]]
}'::jsonb WHERE parcel_code = 'AYW-0001';

-- MDY-0001: Mandalay CBD Lot 7 (Chanayethazan, central Mandalay)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[96.0800, 21.9720], [96.0850, 21.9720], [96.0850, 21.9690], [96.0800, 21.9690], [96.0800, 21.9720]]]
}'::jsonb WHERE parcel_code = 'MDY-0001';

-- SGG-0001: Monywa Industrial Park Site B (Sagaing Region)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[95.1200, 21.9250], [95.1350, 21.9250], [95.1350, 21.9150], [95.1200, 21.9150], [95.1200, 21.9250]]]
}'::jsonb WHERE parcel_code = 'SGG-0001';

-- NPT-0001: Naypyitaw Zone 8 Housing Block (Ottarathiri)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[96.1500, 19.7800], [96.1600, 19.7800], [96.1600, 19.7720], [96.1500, 19.7720], [96.1500, 19.7800]]]
}'::jsonb WHERE parcel_code = 'NPT-0001';

-- YGN-0002: Hlaing Tharyar Waterfront (west Yangon, on river)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[96.0650, 16.8950], [96.0750, 16.8950], [96.0750, 16.8880], [96.0650, 16.8880], [96.0650, 16.8950]]]
}'::jsonb WHERE parcel_code = 'YGN-0002';

-- SHN-0001: Inle Lake Eco-Agriculture Zone (Nyaungshwe, Shan)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[96.9100, 20.4700], [96.9400, 20.4700], [96.9400, 20.4450], [96.9100, 20.4450], [96.9100, 20.4700]]]
}'::jsonb WHERE parcel_code = 'SHN-0001';

-- BGO-0001: Bago Industrial Corridor Plot 3 (along expressway)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[96.4700, 17.3450], [96.4900, 17.3450], [96.4900, 17.3300], [96.4700, 17.3300], [96.4700, 17.3450]]]
}'::jsonb WHERE parcel_code = 'BGO-0001';

-- YGN-0003: Dagon Seikkan New Town (east Yangon)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[96.2700, 16.8650], [96.2780, 16.8650], [96.2780, 16.8590], [96.2700, 16.8590], [96.2700, 16.8650]]]
}'::jsonb WHERE parcel_code = 'YGN-0003';

-- MON-0001: Dawei SEZ Phase 1 Area (southern coast)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[98.0600, 14.0900], [98.1000, 14.0900], [98.1000, 14.0550], [98.0600, 14.0550], [98.0600, 14.0900]]]
}'::jsonb WHERE parcel_code = 'MON-0001';

-- MDY-0002: Amarapura Affordable Housing (south Mandalay)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[96.0550, 21.8950], [96.0650, 21.8950], [96.0650, 21.8870], [96.0550, 21.8870], [96.0550, 21.8950]]]
}'::jsonb WHERE parcel_code = 'MDY-0002';

-- MGW-0001: Magway Dry Zone Irrigation Parcel (central dry zone)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[94.9100, 20.1700], [94.9600, 20.1700], [94.9600, 20.1200], [94.9100, 20.1200], [94.9100, 20.1700]]]
}'::jsonb WHERE parcel_code = 'MGW-0001';

-- TNT-0001: Myeik Fisheries Processing Zone (southern coastal)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[98.5950, 12.4450], [98.6050, 12.4450], [98.6050, 12.4380], [98.5950, 12.4380], [98.5950, 12.4450]]]
}'::jsonb WHERE parcel_code = 'TNT-0001';

-- YGN-0004: Mingaladon Tech Park (north Yangon, near airport)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[96.1650, 16.9350], [96.1780, 16.9350], [96.1780, 16.9250], [96.1650, 16.9250], [96.1650, 16.9350]]]
}'::jsonb WHERE parcel_code = 'YGN-0004';

-- KCN-0001: Myitkyina Border Trade Zone (far north, Kachin)
UPDATE public.land_parcels SET geometry = '{
  "type": "Polygon",
  "coordinates": [[[97.3900, 25.3950], [97.4000, 25.3950], [97.4000, 25.3880], [97.3900, 25.3880], [97.3900, 25.3950]]]
}'::jsonb WHERE parcel_code = 'KCN-0001';
