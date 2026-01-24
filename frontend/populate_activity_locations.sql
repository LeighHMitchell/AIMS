-- SQL Script to Populate Activity Locations with Sample Data
-- This script generates 10-20 realistic locations per activity in Myanmar
-- Each location includes: name, description, activity description, coverage scope, latitude, longitude

-- First, let's create a function to generate random locations within Myanmar
-- Myanmar bounding box: lat 9.5-28.5, lng 92.0-101.5

-- Create temporary table with Myanmar location data
CREATE TEMP TABLE IF NOT EXISTS myanmar_locations (
    id SERIAL,
    location_name TEXT,
    location_description TEXT,
    state_region TEXT,
    township TEXT,
    district TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    coverage_scope TEXT
);

-- Insert realistic Myanmar locations covering all states/regions
INSERT INTO myanmar_locations (location_name, location_description, state_region, township, district, latitude, longitude, coverage_scope) VALUES
-- Yangon Region
('Shwedagon Pagoda Area', 'Major religious and cultural site in Yangon', 'Yangon Region', 'Dagon Township', 'Yangon District', 16.798196, 96.149497, 'local'),
('Yangon Central Railway Station', 'Main transportation hub', 'Yangon Region', 'Pabedan Township', 'Yangon District', 16.783060, 96.158800, 'local'),
('Inya Lake', 'Large freshwater lake area', 'Yangon Region', 'Kamayut Township', 'Yangon District', 16.831000, 96.149000, 'local'),
('Thilawa Industrial Zone', 'Major industrial development area', 'Yangon Region', 'Thanlyin Township', 'Southern District', 16.680000, 96.240000, 'subnational'),
('Hlaing Tharyar Industrial Zone', 'Manufacturing and industrial area', 'Yangon Region', 'Hlaing Tharyar Township', 'Western District', 16.878000, 96.060000, 'local'),
('Mingaladon Airport Area', 'Airport and surrounding commercial zone', 'Yangon Region', 'Mingaladon Township', 'Northern District', 16.907222, 96.133333, 'local'),
('Dala Township', 'Rural township across the river from downtown', 'Yangon Region', 'Dala Township', 'Southern District', 16.761000, 96.153000, 'local'),
('Insein Township', 'Northern Yangon township with markets', 'Yangon Region', 'Insein Township', 'Northern District', 16.894000, 96.107000, 'local'),

-- Mandalay Region
('Mandalay Palace', 'Historic royal palace complex', 'Mandalay Region', 'Chanayethazan Township', 'Mandalay District', 21.996667, 96.093333, 'local'),
('Amarapura', 'Ancient capital with U Bein Bridge', 'Mandalay Region', 'Amarapura Township', 'Mandalay District', 21.913000, 96.066000, 'local'),
('Sagaing Hills', 'Buddhist monastic center', 'Mandalay Region', 'Sagaing Township', 'Sagaing District', 21.879000, 95.980000, 'local'),
('Pyin Oo Lwin', 'Hill station and military center', 'Mandalay Region', 'Pyin Oo Lwin Township', 'Pyin Oo Lwin District', 22.033333, 96.450000, 'local'),
('Myingyan', 'Major town in central dry zone', 'Mandalay Region', 'Myingyan Township', 'Myingyan District', 21.466667, 95.383333, 'subnational'),
('Kyaukse', 'Agricultural center', 'Mandalay Region', 'Kyaukse Township', 'Kyaukse District', 21.600000, 96.133333, 'local'),
('Meiktila', 'Strategic crossroads town', 'Mandalay Region', 'Meiktila Township', 'Meiktila District', 20.866667, 95.866667, 'subnational'),
('Nyaung-U', 'Gateway to Bagan temples', 'Mandalay Region', 'Nyaung-U Township', 'Nyaung-U District', 21.200000, 94.916667, 'local'),

-- Shan State
('Taunggyi', 'Shan State capital', 'Shan State', 'Taunggyi Township', 'Taunggyi District', 20.783333, 97.033333, 'subnational'),
('Inle Lake', 'Famous lake with floating gardens', 'Shan State', 'Nyaungshwe Township', 'Taunggyi District', 20.533333, 96.916667, 'local'),
('Kalaw', 'Hill station and trekking hub', 'Shan State', 'Kalaw Township', 'Kalaw District', 20.633333, 96.566667, 'local'),
('Lashio', 'Northern Shan trade center', 'Shan State', 'Lashio Township', 'Lashio District', 22.933333, 97.750000, 'subnational'),
('Kengtung', 'Eastern Shan cultural center', 'Shan State', 'Kengtung Township', 'Kengtung District', 21.283333, 99.600000, 'local'),
('Hsipaw', 'Historic town on Mandalay-Lashio route', 'Shan State', 'Hsipaw Township', 'Kyaukme District', 22.616667, 97.300000, 'local'),
('Pindaya', 'Cave pagodas and tourism site', 'Shan State', 'Pindaya Township', 'Danu Self-Administered Zone', 20.933333, 96.666667, 'local'),
('Hopong', 'Pa-O cultural area', 'Shan State', 'Hopong Township', 'Pa-O Self-Administered Zone', 20.766667, 97.166667, 'local'),

-- Kachin State
('Myitkyina', 'Kachin State capital', 'Kachin State', 'Myitkyina Township', 'Myitkyina District', 25.383333, 97.400000, 'subnational'),
('Putao', 'Northern frontier town', 'Kachin State', 'Putao Township', 'Putao District', 27.316667, 97.416667, 'local'),
('Bhamo', 'Historic Irrawaddy port', 'Kachin State', 'Bhamo Township', 'Bhamo District', 24.250000, 97.233333, 'local'),
('Mohnyin', 'Central Kachin town', 'Kachin State', 'Mohnyin Township', 'Mohnyin District', 24.766667, 96.366667, 'local'),
('Hpakant', 'Jade mining center', 'Kachin State', 'Hpakant Township', 'Hpakant District', 25.616667, 96.300000, 'local'),

-- Kayah State
('Loikaw', 'Kayah State capital', 'Kayah State', 'Loikaw Township', 'Loikaw District', 19.683333, 97.216667, 'subnational'),
('Demoso', 'Agricultural township', 'Kayah State', 'Demoso Township', 'Loikaw District', 19.550000, 97.183333, 'local'),
('Hpruso', 'Eastern Kayah township', 'Kayah State', 'Hpruso Township', 'Loikaw District', 19.583333, 97.333333, 'local'),

-- Kayin State
('Hpa-An', 'Kayin State capital', 'Kayin State', 'Hpa-An Township', 'Hpa-An District', 16.883333, 97.633333, 'subnational'),
('Myawaddy', 'Border trade town', 'Kayin State', 'Myawaddy Township', 'Myawaddy District', 16.683333, 98.500000, 'local'),
('Kawkareik', 'Strategic pass town', 'Kayin State', 'Kawkareik Township', 'Kawkareik District', 16.550000, 98.250000, 'local'),
('Thandaunggyi', 'Mountain township', 'Kayin State', 'Thandaunggyi Township', 'Hpa-An District', 17.433333, 96.866667, 'local'),

-- Mon State
('Mawlamyine', 'Mon State capital, major port', 'Mon State', 'Mawlamyine Township', 'Mawlamyine District', 16.483333, 97.633333, 'subnational'),
('Kyaiktiyo', 'Golden Rock pilgrimage site', 'Mon State', 'Kyaikto Township', 'Kyaikto District', 17.483333, 97.100000, 'local'),
('Thaton', 'Ancient Mon capital', 'Mon State', 'Thaton Township', 'Thaton District', 16.933333, 97.366667, 'local'),
('Ye', 'Southern Mon coastal town', 'Mon State', 'Ye Township', 'Ye District', 15.250000, 97.866667, 'local'),
('Mudon', 'Agricultural center', 'Mon State', 'Mudon Township', 'Mawlamyine District', 16.250000, 97.733333, 'local'),

-- Rakhine State
('Sittwe', 'Rakhine State capital', 'Rakhine State', 'Sittwe Township', 'Sittwe District', 20.150000, 92.900000, 'subnational'),
('Mrauk U', 'Ancient Rakhine kingdom capital', 'Rakhine State', 'Mrauk-U Township', 'Mrauk-U District', 20.600000, 93.200000, 'local'),
('Kyaukpyu', 'Deep sea port project site', 'Rakhine State', 'Kyaukpyu Township', 'Kyaukpyu District', 19.433333, 93.550000, 'local'),
('Thandwe', 'Ngapali beach gateway', 'Rakhine State', 'Thandwe Township', 'Thandwe District', 18.450000, 94.366667, 'local'),
('Maungdaw', 'Northern Rakhine border town', 'Rakhine State', 'Maungdaw Township', 'Maungdaw District', 20.816667, 92.366667, 'local'),

-- Sagaing Region
('Sagaing City', 'Historic Buddhist center', 'Sagaing Region', 'Sagaing Township', 'Sagaing District', 21.879000, 95.980000, 'subnational'),
('Monywa', 'Major trading center', 'Sagaing Region', 'Monywa Township', 'Monywa District', 22.116667, 95.133333, 'subnational'),
('Shwebo', 'Historic royal city', 'Sagaing Region', 'Shwebo Township', 'Shwebo District', 22.566667, 95.700000, 'local'),
('Katha', 'Irrawaddy river port', 'Sagaing Region', 'Katha Township', 'Katha District', 24.183333, 96.333333, 'local'),
('Kalay', 'Gateway to Chin State', 'Sagaing Region', 'Kalay Township', 'Kalay District', 23.200000, 94.066667, 'local'),
('Tamu', 'India border crossing', 'Sagaing Region', 'Tamu Township', 'Tamu District', 24.216667, 94.300000, 'local'),

-- Magway Region
('Magway', 'Regional capital, oil industry', 'Magway Region', 'Magway Township', 'Magway District', 20.150000, 94.933333, 'subnational'),
('Pakokku', 'Major dry zone town', 'Magway Region', 'Pakokku Township', 'Pakokku District', 21.333333, 95.083333, 'subnational'),
('Minbu', 'Oil and gas center', 'Magway Region', 'Minbu Township', 'Minbu District', 20.183333, 94.883333, 'local'),
('Yenangyaung', 'Historic oil town', 'Magway Region', 'Yenangyaung Township', 'Magway District', 20.466667, 94.866667, 'local'),
('Chauk', 'Oil field area', 'Magway Region', 'Chauk Township', 'Chauk District', 20.900000, 94.816667, 'local'),

-- Bago Region
('Bago', 'Ancient capital, religious center', 'Bago Region', 'Bago Township', 'Bago District', 17.333333, 96.483333, 'subnational'),
('Pyay', 'Historic Sri Ksetra site', 'Bago Region', 'Pyay Township', 'Pyay District', 18.816667, 95.216667, 'subnational'),
('Taungoo', 'Historic Toungoo dynasty capital', 'Bago Region', 'Taungoo Township', 'Taungoo District', 18.950000, 96.433333, 'local'),
('Nyaunglebin', 'Agricultural center', 'Bago Region', 'Nyaunglebin Township', 'Bago District', 17.950000, 96.716667, 'local'),
('Shwegyin', 'River town', 'Bago Region', 'Shwegyin Township', 'Bago District', 17.933333, 96.900000, 'local'),

-- Ayeyarwady Region
('Pathein', 'Delta capital, fishing center', 'Ayeyarwady Region', 'Pathein Township', 'Pathein District', 16.783333, 94.733333, 'subnational'),
('Myaungmya', 'Agricultural center', 'Ayeyarwady Region', 'Myaungmya Township', 'Myaungmya District', 16.583333, 95.200000, 'local'),
('Labutta', 'Cyclone Nargis affected area', 'Ayeyarwady Region', 'Labutta Township', 'Labutta District', 16.150000, 94.766667, 'local'),
('Bogale', 'Delta township', 'Ayeyarwady Region', 'Bogale Township', 'Bogale District', 16.300000, 95.400000, 'local'),
('Hinthada', 'Northern delta town', 'Ayeyarwady Region', 'Hinthada Township', 'Hinthada District', 17.633333, 95.466667, 'local'),
('Maubin', 'Rice-growing region', 'Ayeyarwady Region', 'Maubin Township', 'Maubin District', 16.733333, 95.650000, 'local'),

-- Tanintharyi Region
('Dawei', 'Deep sea port project site', 'Tanintharyi Region', 'Dawei Township', 'Dawei District', 14.083333, 98.200000, 'subnational'),
('Myeik', 'Archipelago gateway', 'Tanintharyi Region', 'Myeik Township', 'Myeik District', 12.433333, 98.600000, 'subnational'),
('Kawthaung', 'Southern tip, Thailand border', 'Tanintharyi Region', 'Kawthaung Township', 'Kawthaung District', 9.983333, 98.550000, 'local'),
('Bokpyin', 'Coastal fishing town', 'Tanintharyi Region', 'Bokpyin Township', 'Kawthaung District', 11.283333, 98.766667, 'local'),

-- Chin State
('Hakha', 'Chin State capital', 'Chin State', 'Hakha Township', 'Hakha District', 22.650000, 93.616667, 'subnational'),
('Falam', 'Northern Chin town', 'Chin State', 'Falam Township', 'Falam District', 22.916667, 93.683333, 'local'),
('Mindat', 'Southern Chin mountains', 'Chin State', 'Mindat Township', 'Mindat District', 21.383333, 93.983333, 'local'),
('Tedim', 'Northeastern Chin area', 'Chin State', 'Tedim Township', 'Falam District', 23.366667, 93.683333, 'local'),

-- Naypyidaw Union Territory
('Naypyidaw Ottarathiri', 'Capital city government zone', 'Naypyidaw', 'Ottarathiri Township', 'Naypyidaw District', 19.833333, 96.116667, 'subnational'),
('Naypyidaw Zabuthiri', 'Residential zone', 'Naypyidaw', 'Zabuthiri Township', 'Naypyidaw District', 19.750000, 96.166667, 'local'),
('Naypyidaw Pobbathiri', 'Botanical gardens area', 'Naypyidaw', 'Pobbathiri Township', 'Naypyidaw District', 19.866667, 96.250000, 'local'),
('Pyinmana', 'Original town near capital', 'Naypyidaw', 'Pyinmana Township', 'Naypyidaw District', 19.733333, 96.200000, 'local'),
('Lewe', 'Agricultural township', 'Naypyidaw', 'Lewe Township', 'Naypyidaw District', 19.633333, 96.133333, 'local');

-- Activity description templates
CREATE TEMP TABLE IF NOT EXISTS activity_descriptions (
    id SERIAL,
    template TEXT
);

INSERT INTO activity_descriptions (template) VALUES
('Distribution of essential supplies and humanitarian assistance'),
('Community health education and awareness programs'),
('Water, sanitation and hygiene (WASH) infrastructure development'),
('Livelihood support and vocational training programs'),
('Emergency food assistance and nutrition support'),
('Primary healthcare service delivery'),
('Education support and school rehabilitation'),
('Agricultural extension and farmer support'),
('Shelter construction and rehabilitation'),
('Community-based protection activities'),
('Disaster risk reduction and preparedness training'),
('Women empowerment and gender-based violence prevention'),
('Child protection and education services'),
('Mental health and psychosocial support services'),
('Cash transfer and economic recovery programs'),
('Infrastructure rehabilitation and community development'),
('Refugee and IDP assistance programs'),
('Environmental conservation and climate adaptation'),
('Microfinance and small business development'),
('Health facility construction and equipment');

-- Now insert locations for each activity
-- This generates 10-20 random locations per activity

DO $$
DECLARE
    activity_record RECORD;
    location_record RECORD;
    activity_desc_record RECORD;
    num_locations INTEGER;
    location_counter INTEGER;
    random_offset_lat DECIMAL(10,8);
    random_offset_lng DECIMAL(11,8);
    new_lat DECIMAL(10,8);
    new_lng DECIMAL(11,8);
    loc_name TEXT;
    loc_desc TEXT;
    act_desc TEXT;
    coverage TEXT;
BEGIN
    -- Loop through all activities
    FOR activity_record IN
        SELECT id, title_narrative, description_narrative FROM activities
        WHERE activity_status IS NULL OR activity_status != 'cancelled'
    LOOP
        -- Generate random number of locations (10-20)
        num_locations := 10 + floor(random() * 11)::integer;
        location_counter := 0;

        -- Insert locations for this activity
        FOR location_record IN
            SELECT * FROM myanmar_locations
            ORDER BY random()
            LIMIT num_locations
        LOOP
            location_counter := location_counter + 1;

            -- Add small random offset to coordinates (within ~5km)
            random_offset_lat := (random() - 0.5) * 0.1;
            random_offset_lng := (random() - 0.5) * 0.1;
            new_lat := location_record.latitude + random_offset_lat;
            new_lng := location_record.longitude + random_offset_lng;

            -- Generate location name with activity context
            loc_name := location_record.location_name || ' - Site ' || location_counter;

            -- Generate location description
            loc_desc := 'Project site located in ' || location_record.township || ', ' ||
                       location_record.state_region || '. ' || location_record.location_description;

            -- Get random activity description
            SELECT template INTO act_desc
            FROM activity_descriptions
            ORDER BY random()
            LIMIT 1;

            -- Determine coverage scope
            coverage := location_record.coverage_scope;

            -- Insert the location
            INSERT INTO activity_locations (
                id,
                activity_id,
                location_type,
                location_name,
                description,
                location_description,
                activity_location_description,
                latitude,
                longitude,
                coverage_scope,
                state_region_name,
                township_name,
                district_name,
                country_code,
                source,
                validation_status,
                location_reach,
                exactness,
                location_class,
                spatial_reference_system,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                activity_record.id,
                'site',
                loc_name,
                loc_desc,
                'Geographic location for project implementation in ' || location_record.state_region,
                act_desc || ' in ' || location_record.township || ', ' || location_record.state_region,
                new_lat,
                new_lng,
                coverage,
                location_record.state_region,
                location_record.township,
                location_record.district,
                'MM',
                'import',
                'valid',
                1,  -- Activity reach
                2,  -- Approximate exactness
                2,  -- Populated place
                'http://www.opengis.net/def/crs/EPSG/0/4326',
                NOW(),
                NOW()
            );

        END LOOP;

        RAISE NOTICE 'Added % locations for activity: %', location_counter, activity_record.title_narrative;
    END LOOP;
END $$;

-- Clean up temp tables
DROP TABLE IF EXISTS myanmar_locations;
DROP TABLE IF EXISTS activity_descriptions;

-- Show summary
SELECT
    a.title_narrative as activity_title,
    COUNT(al.id) as location_count,
    ROUND(AVG(al.latitude)::numeric, 4) as avg_latitude,
    ROUND(AVG(al.longitude)::numeric, 4) as avg_longitude
FROM activities a
LEFT JOIN activity_locations al ON a.id = al.activity_id
WHERE a.activity_status IS NULL OR a.activity_status != 'cancelled'
GROUP BY a.id, a.title_narrative
ORDER BY location_count DESC;
