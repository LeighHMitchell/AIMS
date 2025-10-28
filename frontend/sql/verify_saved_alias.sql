-- Verify the alias was saved for KOICA

SELECT 
    id,
    name,
    acronym,
    iati_org_id,
    alias_refs,
    name_aliases,
    type,
    country_represented
FROM organizations
WHERE name ILIKE '%KOREA%' OR acronym = 'KOICA'
ORDER BY name;

