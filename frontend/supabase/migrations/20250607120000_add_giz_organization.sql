-- Migration: Add Deutsche Gesellschaft für Internationale Zusammenarbeit (GIZ)

-- This script inserts the German development agency GIZ into the organizations table,
-- ensuring it's categorized correctly as a 'Government' entity based on the IATI DAC code '10'.

DO $$
BEGIN
    -- Ensure the organization does not already exist by checking its name or code.
    IF NOT EXISTS (
        SELECT 1 FROM organizations 
        WHERE name = 'Deutsche Gesellschaft für Internationale Zusammenarbeit' 
        OR code = 'XM-DAC-41126'
    ) THEN
        -- Insert the new organization record.
        INSERT INTO organizations (
            name,
            acronym,
            type, -- The organization type code from the organization_types table.
            code, -- IATI organization identifier.
            country,
            description,
            website,
            email,
            address
        ) VALUES (
            'Deutsche Gesellschaft für Internationale Zusammenarbeit',
            'GIZ',
            '10', -- Code for 'Government' type.
            'XM-DAC-41126',
            'Germany',
            'GIZ is Germany's main international development agency, implementing projects worldwide to promote sustainable economic, social, and environmental development.',
            'https://www.giz.de',
            'info@giz.de',
            'Friedrich-Ebert-Allee 32 + 36, 53113 Bonn, Germany'
        );
    END IF;
END $$; 