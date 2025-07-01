-- Check and Fix Transaction Types
-- Run this script section by section

-- 1. First, see what transaction type values currently exist:
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'transaction_type_enum'::regtype 
ORDER BY enumlabel;

-- 2. Based on what's missing from the above query, run only the needed ALTER statements:
-- (Comment out any that already exist)

-- IATI Transaction Type Codes:
ALTER TYPE transaction_type_enum ADD VALUE '1';   -- Incoming Funds
ALTER TYPE transaction_type_enum ADD VALUE '2';   -- Commitment (Outgoing)
ALTER TYPE transaction_type_enum ADD VALUE '3';   -- Disbursement
ALTER TYPE transaction_type_enum ADD VALUE '4';   -- Expenditure
ALTER TYPE transaction_type_enum ADD VALUE '5';   -- Interest Payment
ALTER TYPE transaction_type_enum ADD VALUE '6';   -- Loan Repayment
ALTER TYPE transaction_type_enum ADD VALUE '7';   -- Reimbursement
ALTER TYPE transaction_type_enum ADD VALUE '8';   -- Purchase of Equity
ALTER TYPE transaction_type_enum ADD VALUE '11';  -- Incoming Commitment
ALTER TYPE transaction_type_enum ADD VALUE '12';  -- Outgoing Commitment
ALTER TYPE transaction_type_enum ADD VALUE '13';  -- Incoming Pledge

-- 3. Verify all values are now present:
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'transaction_type_enum'::regtype 
ORDER BY enumlabel; 