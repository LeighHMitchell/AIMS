-- Create Financing Terms Tables for IATI CRS-add data
-- Supports loan terms, loan status (yearly), and OECD CRS flags

-- =====================================================
-- 1. Create activity_financing_terms table (1:1 with activities)
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_financing_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  
  -- Loan Terms fields (from <loan-terms> element)
  rate_1 DECIMAL(5,2), -- Interest rate 1
  rate_2 DECIMAL(5,2), -- Interest rate 2
  repayment_type_code VARCHAR(10), -- IATI repayment type code (1-4)
  repayment_plan_code VARCHAR(10), -- IATI repayment plan code (1-4)
  commitment_date DATE, -- Date of commitment
  repayment_first_date DATE, -- Date of first repayment
  repayment_final_date DATE, -- Date of final repayment
  
  -- OECD CRS Flags (from <other-flags> elements, stored as JSONB array)
  -- Format: [{"code": "1", "significance": "1"}, ...]
  other_flags JSONB DEFAULT '[]'::jsonb,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure only one financing terms record per activity
  CONSTRAINT unique_activity_financing_terms UNIQUE (activity_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_financing_terms_activity_id ON activity_financing_terms(activity_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_financing_terms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_financing_terms_updated_at ON activity_financing_terms;
CREATE TRIGGER trigger_update_financing_terms_updated_at
  BEFORE UPDATE ON activity_financing_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_financing_terms_updated_at();

-- Add comments
COMMENT ON TABLE activity_financing_terms IS 'Stores IATI CRS-add loan terms data for activities';
COMMENT ON COLUMN activity_financing_terms.rate_1 IS 'Interest rate 1 (percentage)';
COMMENT ON COLUMN activity_financing_terms.rate_2 IS 'Interest rate 2 (percentage)';
COMMENT ON COLUMN activity_financing_terms.repayment_type_code IS 'IATI repayment type code (1-4)';
COMMENT ON COLUMN activity_financing_terms.repayment_plan_code IS 'IATI repayment plan code (1-4)';
COMMENT ON COLUMN activity_financing_terms.other_flags IS 'OECD CRS flags as JSONB array with code and significance';

-- =====================================================
-- 2. Create activity_loan_status table (1:many with activities)
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_loan_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  
  -- Yearly loan status fields (from <loan-status> element)
  year INTEGER NOT NULL, -- Fiscal year
  currency VARCHAR(3) NOT NULL, -- ISO 4217 currency code
  value_date DATE, -- Date for which values are accurate
  
  -- Financial amounts
  interest_received DECIMAL(15,2), -- Interest received during the year
  principal_outstanding DECIMAL(15,2), -- Principal outstanding at year end
  principal_arrears DECIMAL(15,2), -- Principal in arrears
  interest_arrears DECIMAL(15,2), -- Interest in arrears
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure only one loan status per activity per year
  CONSTRAINT unique_activity_loan_status_year UNIQUE (activity_id, year),
  
  -- Validate year is reasonable (between 1990 and 2100)
  CONSTRAINT check_loan_status_year CHECK (year >= 1990 AND year <= 2100),
  
  -- Ensure amounts are non-negative
  CONSTRAINT check_interest_received CHECK (interest_received IS NULL OR interest_received >= 0),
  CONSTRAINT check_principal_outstanding CHECK (principal_outstanding IS NULL OR principal_outstanding >= 0),
  CONSTRAINT check_principal_arrears CHECK (principal_arrears IS NULL OR principal_arrears >= 0),
  CONSTRAINT check_interest_arrears CHECK (interest_arrears IS NULL OR interest_arrears >= 0)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_loan_status_activity_id ON activity_loan_status(activity_id);
CREATE INDEX IF NOT EXISTS idx_loan_status_year ON activity_loan_status(year);
CREATE INDEX IF NOT EXISTS idx_loan_status_activity_year ON activity_loan_status(activity_id, year);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_loan_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_loan_status_updated_at ON activity_loan_status;
CREATE TRIGGER trigger_update_loan_status_updated_at
  BEFORE UPDATE ON activity_loan_status
  FOR EACH ROW
  EXECUTE FUNCTION update_loan_status_updated_at();

-- Add comments
COMMENT ON TABLE activity_loan_status IS 'Stores yearly IATI CRS-add loan status data for activities';
COMMENT ON COLUMN activity_loan_status.year IS 'Fiscal year for the loan status';
COMMENT ON COLUMN activity_loan_status.interest_received IS 'Interest received during the year';
COMMENT ON COLUMN activity_loan_status.principal_outstanding IS 'Principal outstanding at year end';
COMMENT ON COLUMN activity_loan_status.principal_arrears IS 'Principal in arrears';
COMMENT ON COLUMN activity_loan_status.interest_arrears IS 'Interest in arrears';

-- =====================================================
-- 3. Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE activity_financing_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_loan_status ENABLE ROW LEVEL SECURITY;

-- Policy for activity_financing_terms: SELECT
DROP POLICY IF EXISTS "Users can view financing terms for activities they can view" ON activity_financing_terms;
CREATE POLICY "Users can view financing terms for activities they can view"
  ON activity_financing_terms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_financing_terms.activity_id
    )
  );

-- Policy for activity_financing_terms: INSERT
DROP POLICY IF EXISTS "Users can insert financing terms for activities they can edit" ON activity_financing_terms;
CREATE POLICY "Users can insert financing terms for activities they can edit"
  ON activity_financing_terms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_financing_terms.activity_id
    )
  );

-- Policy for activity_financing_terms: UPDATE
DROP POLICY IF EXISTS "Users can update financing terms for activities they can edit" ON activity_financing_terms;
CREATE POLICY "Users can update financing terms for activities they can edit"
  ON activity_financing_terms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_financing_terms.activity_id
    )
  );

-- Policy for activity_financing_terms: DELETE
DROP POLICY IF EXISTS "Users can delete financing terms for activities they can edit" ON activity_financing_terms;
CREATE POLICY "Users can delete financing terms for activities they can edit"
  ON activity_financing_terms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_financing_terms.activity_id
    )
  );

-- Policy for activity_loan_status: SELECT
DROP POLICY IF EXISTS "Users can view loan status for activities they can view" ON activity_loan_status;
CREATE POLICY "Users can view loan status for activities they can view"
  ON activity_loan_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_loan_status.activity_id
    )
  );

-- Policy for activity_loan_status: INSERT
DROP POLICY IF EXISTS "Users can insert loan status for activities they can edit" ON activity_loan_status;
CREATE POLICY "Users can insert loan status for activities they can edit"
  ON activity_loan_status FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_loan_status.activity_id
    )
  );

-- Policy for activity_loan_status: UPDATE
DROP POLICY IF EXISTS "Users can update loan status for activities they can edit" ON activity_loan_status;
CREATE POLICY "Users can update loan status for activities they can edit"
  ON activity_loan_status FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_loan_status.activity_id
    )
  );

-- Policy for activity_loan_status: DELETE
DROP POLICY IF EXISTS "Users can delete loan status for activities they can edit" ON activity_loan_status;
CREATE POLICY "Users can delete loan status for activities they can edit"
  ON activity_loan_status FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_loan_status.activity_id
    )
  );

