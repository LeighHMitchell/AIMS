-- Add finance_type_inherited flag to transactions table
-- This flag indicates when finance_type was inherited from activity defaults vs explicitly set

BEGIN;

-- Add the column
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS finance_type_inherited BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN transactions.finance_type_inherited IS 
'Indicates whether the finance_type was inherited from the activity default_finance_type (TRUE) or explicitly set at the transaction level (FALSE)';

-- Create an index for faster queries on inherited finance types
CREATE INDEX IF NOT EXISTS idx_transactions_finance_type_inherited 
ON transactions(finance_type_inherited) 
WHERE finance_type_inherited = TRUE;

COMMIT;



