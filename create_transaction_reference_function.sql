-- Create the missing transaction reference generation function
-- Generates references in format: ADRI-001-TRANS-123345789
-- Where ADRI-001 is the Activity ID and 123345789 is a unique transaction counter

CREATE OR REPLACE FUNCTION generate_unique_transaction_reference(
    p_activity_id UUID,
    p_base_reference TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_activity_code TEXT;
    v_counter INTEGER;
    v_reference TEXT;
    v_exists BOOLEAN;
    v_attempt INTEGER := 0;
BEGIN
    -- Get the activity ID/code from the activities table
    SELECT activity_id INTO v_activity_code
    FROM activities
    WHERE id = p_activity_id;
    
    -- Fallback if activity not found or activity_id is null
    IF v_activity_code IS NULL THEN
        SELECT COALESCE(iati_identifier, iati_id, 'ACT-' || LEFT(id::TEXT, 8))
        INTO v_activity_code
        FROM activities
        WHERE id = p_activity_id;
        
        -- Final fallback
        IF v_activity_code IS NULL THEN
            v_activity_code := 'UNKNOWN-' || LEFT(p_activity_id::TEXT, 8);
        END IF;
    END IF;
    
    -- Generate a unique counter for this activity
    -- Use microsecond timestamp + random component for better uniqueness
    v_counter := (EXTRACT(EPOCH FROM NOW() AT TIME ZONE 'UTC') * 1000000)::BIGINT % 1000000000;
    v_counter := v_counter + (RANDOM() * 1000)::INTEGER;
    
    -- Generate unique reference
    LOOP
        v_reference := v_activity_code || '-TRANS-' || v_counter::TEXT;
        
        -- Check if this reference already exists ANYWHERE (not just this activity)
        SELECT EXISTS(
            SELECT 1 FROM transactions 
            WHERE transaction_reference = v_reference
        ) INTO v_exists;
        
        -- If unique globally, return it
        IF NOT v_exists THEN
            RETURN v_reference;
        END IF;
        
        -- Increment counter and try again
        v_counter := v_counter + 1;
        v_attempt := v_attempt + 1;
        
        -- Safety check to prevent infinite loop
        IF v_attempt > 1000 THEN
            -- If we've tried 1000 times, add a random suffix
            v_reference := v_activity_code || '-TRANS-' || v_counter::TEXT || '-' || (RANDOM() * 10000)::INTEGER;
            
            -- Final check
            SELECT EXISTS(
                SELECT 1 FROM transactions 
                WHERE transaction_reference = v_reference
            ) INTO v_exists;
            
            IF NOT v_exists THEN
                RETURN v_reference;
            END IF;
            
            RAISE EXCEPTION 'Could not generate unique transaction reference after 1000 attempts';
        END IF;
    END LOOP;
END;
$$;

-- Grant execute permission to the roles that need it
GRANT EXECUTE ON FUNCTION generate_unique_transaction_reference(UUID, TEXT) TO authenticated, anon;

-- Add a comment for documentation
COMMENT ON FUNCTION generate_unique_transaction_reference IS 'Generates unique transaction references in format ACTIVITY_ID-TRANS-TIMESTAMP. Uses activity_id field from activities table.';
