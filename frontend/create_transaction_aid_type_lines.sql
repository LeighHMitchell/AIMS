-- Create transaction_aid_type_lines table for storing multiple aid types per transaction
-- This mirrors the transaction_sector_lines pattern

CREATE TABLE IF NOT EXISTS transaction_aid_type_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(uuid) ON DELETE CASCADE,
  aid_type_vocabulary VARCHAR(10) DEFAULT '1', -- IATI aid type vocabulary (1 = OECD DAC)
  aid_type_code VARCHAR(10) NOT NULL, -- Aid type code (e.g., 'A01', 'C01')
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transaction_aid_type_lines_transaction_id
  ON transaction_aid_type_lines(transaction_id);

-- Create index for non-deleted records
CREATE INDEX IF NOT EXISTS idx_transaction_aid_type_lines_active
  ON transaction_aid_type_lines(transaction_id)
  WHERE deleted_at IS NULL;

-- Add RLS policies (similar to transaction_sector_lines)
ALTER TABLE transaction_aid_type_lines ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select
CREATE POLICY "Allow authenticated users to select transaction_aid_type_lines"
  ON transaction_aid_type_lines FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert transaction_aid_type_lines"
  ON transaction_aid_type_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated users to update transaction_aid_type_lines"
  ON transaction_aid_type_lines FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete transaction_aid_type_lines"
  ON transaction_aid_type_lines FOR DELETE
  TO authenticated
  USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to transaction_aid_type_lines"
  ON transaction_aid_type_lines FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE transaction_aid_type_lines IS 'Stores multiple aid type classifications per transaction (IATI transaction/aid-type element)';
