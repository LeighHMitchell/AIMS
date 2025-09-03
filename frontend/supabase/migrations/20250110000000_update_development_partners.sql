-- Migration: Update Development Partners Classification
-- This script ensures major development agencies are correctly classified as development partners

DO $$
BEGIN
    -- Update GIZ to be a development partner
    UPDATE organizations 
    SET is_development_partner = true,
        cooperation_modality = 'External'
    WHERE name ILIKE '%Deutsche Gesellschaft für Internationale Zusammenarbeit%'
       OR code = 'XM-DAC-41126'
       OR acronym = 'GIZ';

    -- Update other major development agencies if they exist
    UPDATE organizations 
    SET is_development_partner = true,
        cooperation_modality = CASE 
            WHEN name ILIKE '%USAID%' OR acronym = 'USAID' THEN 'External'
            WHEN name ILIKE '%DFAT%' OR acronym = 'DFAT' THEN 'External'
            WHEN name ILIKE '%DFID%' OR acronym = 'DFID' THEN 'External'
            WHEN name ILIKE '%AFD%' OR acronym = 'AFD' THEN 'External'
            WHEN name ILIKE '%JICA%' OR acronym = 'JICA' THEN 'External'
            WHEN name ILIKE '%World Bank%' OR acronym = 'WB' THEN 'Multilateral'
            WHEN name ILIKE '%UNDP%' OR acronym = 'UNDP' THEN 'Multilateral'
            WHEN name ILIKE '%UNICEF%' OR acronym = 'UNICEF' THEN 'Multilateral'
            WHEN name ILIKE '%WHO%' OR acronym = 'WHO' THEN 'Multilateral'
            WHEN name ILIKE '%Asian Development Bank%' OR acronym = 'ADB' THEN 'Regional'
            WHEN name ILIKE '%European Union%' OR acronym = 'EU' THEN 'Regional'
            ELSE 'External'
        END
    WHERE (
        name ILIKE '%USAID%' OR acronym = 'USAID' OR
        name ILIKE '%DFAT%' OR acronym = 'DFAT' OR
        name ILIKE '%DFID%' OR acronym = 'DFID' OR
        name ILIKE '%AFD%' OR acronym = 'AFD' OR
        name ILIKE '%JICA%' OR acronym = 'JICA' OR
        name ILIKE '%World Bank%' OR acronym = 'WB' OR
        name ILIKE '%UNDP%' OR acronym = 'UNDP' OR
        name ILIKE '%UNICEF%' OR acronym = 'UNICEF' OR
        name ILIKE '%WHO%' OR acronym = 'WHO' OR
        name ILIKE '%Asian Development Bank%' OR acronym = 'ADB' OR
        name ILIKE '%European Union%' OR acronym = 'EU' OR
        name ILIKE '%United Nations%' OR
        name ILIKE '%Agence Française%' OR
        name ILIKE '%Japan International%' OR
        name ILIKE '%United States Agency%' OR
        name ILIKE '%Department for International%'
    );

    -- Log the changes
    RAISE NOTICE 'Updated development partner classifications';
    
END $$; 