-- Create IATI import history table
CREATE TABLE IF NOT EXISTS iati_import_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_name TEXT,
  activities_count INTEGER NOT NULL DEFAULT 0,
  organizations_count INTEGER NOT NULL DEFAULT 0,
  transactions_count INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'completed_with_errors', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_iati_import_history_user_id ON iati_import_history(user_id);
CREATE INDEX idx_iati_import_history_timestamp ON iati_import_history(timestamp DESC);
CREATE INDEX idx_iati_import_history_status ON iati_import_history(status);

-- Add row-level security
ALTER TABLE iati_import_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all import history
CREATE POLICY "Users can view import history" ON iati_import_history
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Only super admins and the user who created the import can insert
CREATE POLICY "Users can create import history" ON iati_import_history
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_user', 'gov_partner_tier_1', 'donor_partner')
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_iati_import_history_updated_at
  BEFORE UPDATE ON iati_import_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add iati_org_id column to organizations table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'iati_org_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN iati_org_id TEXT UNIQUE;
    CREATE INDEX idx_organizations_iati_org_id ON organizations(iati_org_id);
  END IF;
END $$;

-- Add iati_identifier column to activities table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' 
    AND column_name = 'iati_identifier'
  ) THEN
    ALTER TABLE activities ADD COLUMN iati_identifier TEXT UNIQUE;
    CREATE INDEX idx_activities_iati_identifier ON activities(iati_identifier);
  END IF;
END $$;

-- Add sectors column to activities table if it doesn't exist (using JSONB for flexibility)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' 
    AND column_name = 'sectors'
  ) THEN
    ALTER TABLE activities ADD COLUMN sectors JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add provider_org_id and receiver_org_id columns to transactions table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'provider_org_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN provider_org_id UUID REFERENCES organizations(id);
    CREATE INDEX idx_transactions_provider_org_id ON transactions(provider_org_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'receiver_org_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN receiver_org_id UUID REFERENCES organizations(id);
    CREATE INDEX idx_transactions_receiver_org_id ON transactions(receiver_org_id);
  END IF;
END $$; 