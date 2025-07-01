-- Fix Transaction Type Enum Values
-- This script safely adds missing IATI transaction types without duplicates

-- First, let's see what values already exist
SELECT unnest(enum_range(NULL::transaction_type_enum)) AS existing_values
ORDER BY existing_values;

-- Add missing IATI transaction types one by one
-- Only run the ALTER statements for values that don't exist yet

DO $$
BEGIN
    -- Check and add value '1' (Incoming Funds)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = '1' 
        AND enumtypid = 'transaction_type_enum'::regtype
    ) THEN
        ALTER TYPE transaction_type_enum ADD VALUE '1';
    END IF;

    -- Check and add value '2' (Commitment)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = '2' 
        AND enumtypid = 'transaction_type_enum'::regtype
    ) THEN
        ALTER TYPE transaction_type_enum ADD VALUE '2';
    END IF;

    -- Check and add value '3' (Disbursement)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = '3' 
        AND enumtypid = 'transaction_type_enum'::regtype
    ) THEN
        ALTER TYPE transaction_type_enum ADD VALUE '3';
    END IF;

    -- Check and add value '4' (Expenditure)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = '4' 
        AND enumtypid = 'transaction_type_enum'::regtype
    ) THEN
        ALTER TYPE transaction_type_enum ADD VALUE '4';
    END IF;

    -- Check and add value '5' (Interest Payment)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = '5' 
        AND enumtypid = 'transaction_type_enum'::regtype
    ) THEN
        ALTER TYPE transaction_type_enum ADD VALUE '5';
    END IF;

    -- Check and add value '6' (Loan Repayment)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = '6' 
        AND enumtypid = 'transaction_type_enum'::regtype
    ) THEN
        ALTER TYPE transaction_type_enum ADD VALUE '6';
    END IF;

    -- Check and add value '7' (Reimbursement)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = '7' 
        AND enumtypid = 'transaction_type_enum'::regtype
    ) THEN
        ALTER TYPE transaction_type_enum ADD VALUE '7';
    END IF;

    -- Check and add value '8' (Purchase of Equity)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = '8' 
        AND enumtypid = 'transaction_type_enum'::regtype
    ) THEN
        ALTER TYPE transaction_type_enum ADD VALUE '8';
    END IF;

    -- Check and add value '11' (Incoming Commitment)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = '11' 
        AND enumtypid = 'transaction_type_enum'::regtype
    ) THEN
        ALTER TYPE transaction_type_enum ADD VALUE '11';
    END IF;

    -- Check and add value '12' (Outgoing Commitment)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = '12' 
        AND enumtypid = 'transaction_type_enum'::regtype
    ) THEN
        ALTER TYPE transaction_type_enum ADD VALUE '12';
    END IF;

    -- Check and add value '13' (Incoming Pledge)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = '13' 
        AND enumtypid = 'transaction_type_enum'::regtype
    ) THEN
        ALTER TYPE transaction_type_enum ADD VALUE '13';
    END IF;
END $$;

-- Alternative approach: Add each value individually (use if the above doesn't work)
-- Comment out any lines for values that already exist

-- ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS '1';  -- Incoming Funds
-- ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS '2';  -- Commitment  
-- ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS '3';  -- Disbursement
-- ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS '4';  -- Expenditure
-- ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS '5';  -- Interest Payment
-- ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS '6';  -- Loan Repayment
-- ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS '7';  -- Reimbursement
-- ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS '8';  -- Purchase of Equity
-- ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS '11'; -- Incoming Commitment
-- ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS '12'; -- Outgoing Commitment
-- ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS '13'; -- Incoming Pledge

-- Verify all values are now present
SELECT unnest(enum_range(NULL::transaction_type_enum)) AS transaction_types
ORDER BY transaction_types; 