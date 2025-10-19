-- Migration: Add Missing IATI Fields
-- Date: 2025-01-20
-- Description: Add support for missing IATI fields including contacts, conditions, budgets, 
--              planned disbursements, humanitarian scope, document links, and financing terms

-- ============================================================================
-- 1. Add missing columns to activities table
-- ============================================================================

-- Add humanitarian fields
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS humanitarian BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS budget_not_provided BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS linked_data_uri TEXT,
ADD COLUMN IF NOT EXISTS conditions_attached BOOLEAN DEFAULT false;

-- Add index for humanitarian queries
CREATE INDEX IF NOT EXISTS idx_activities_humanitarian ON activities(humanitarian) WHERE humanitarian = true;

-- Add humanitarian column to transactions table (IATI allows transaction-level humanitarian flag)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS humanitarian BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_transactions_humanitarian ON transactions(humanitarian) WHERE humanitarian = true;

-- ============================================================================
-- 2. Activity Contacts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  contact_type VARCHAR(10) DEFAULT '1', -- IATI ContactType code (1=General Enquiries, 2=Project Management, etc.)
  organization_name TEXT,
  department TEXT,
  person_name TEXT,
  job_title TEXT,
  telephone VARCHAR(50),
  email VARCHAR(255),
  website TEXT,
  mailing_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_contacts_activity_id ON activity_contacts(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_contacts_email ON activity_contacts(email) WHERE email IS NOT NULL;

-- ============================================================================
-- 3. Activity Conditions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  condition_type VARCHAR(10) DEFAULT '1', -- IATI ConditionType code (1=Policy, 2=Performance, 3=Fiduciary)
  condition_text TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_conditions_activity_id ON activity_conditions(activity_id);

-- ============================================================================
-- 4. Activity Budgets Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  budget_type VARCHAR(10) DEFAULT '1', -- IATI BudgetType code (1=Original, 2=Revised)
  budget_status VARCHAR(10) DEFAULT '1', -- IATI BudgetStatus code (1=Indicative, 2=Committed)
  period_start DATE,
  period_end DATE,
  amount DECIMAL(20,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  value_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_budgets_activity_id ON activity_budgets(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_budgets_period ON activity_budgets(period_start, period_end);

-- ============================================================================
-- 5. Planned Disbursements Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS planned_disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  disbursement_type VARCHAR(10) DEFAULT '1', -- IATI BudgetType code
  period_start DATE,
  period_end DATE,
  amount DECIMAL(20,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  value_date DATE,
  provider_org_ref VARCHAR(255),
  provider_org_name TEXT,
  provider_org_activity_id VARCHAR(255),
  receiver_org_ref VARCHAR(255),
  receiver_org_name TEXT,
  receiver_org_activity_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planned_disbursements_activity_id ON planned_disbursements(activity_id);
CREATE INDEX IF NOT EXISTS idx_planned_disbursements_period ON planned_disbursements(period_start, period_end);

-- ============================================================================
-- 6. Activity Humanitarian Scope Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_humanitarian_scope (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  scope_type VARCHAR(10) DEFAULT '1', -- IATI HumanitarianScopeType code (1=Emergency, 2=Appeal)
  vocabulary VARCHAR(10) DEFAULT '1-2', -- IATI HumanitarianScopeVocabulary (1-2=GLIDE, 2-1=HRP, 99=custom)
  code VARCHAR(255) NOT NULL,
  vocabulary_uri TEXT,
  narratives JSONB, -- Store multilingual narratives as JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_humanitarian_scope_activity_id ON activity_humanitarian_scope(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_humanitarian_scope_code ON activity_humanitarian_scope(code);

-- ============================================================================
-- 7. Activity Documents Table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  document_format VARCHAR(255), -- MIME type
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  category_code VARCHAR(10), -- IATI DocumentCategory code
  language_code VARCHAR(10) DEFAULT 'en',
  document_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_documents_activity_id ON activity_documents(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_documents_category ON activity_documents(category_code);

-- ============================================================================
-- 8. Financing Terms Tables (CRS-add)
-- ============================================================================

-- Main financing terms table
CREATE TABLE IF NOT EXISTS financing_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL UNIQUE REFERENCES activities(id) ON DELETE CASCADE,
  channel_code VARCHAR(10), -- CRS Channel Code
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_financing_terms_activity_id ON financing_terms(activity_id);

-- Loan terms table
CREATE TABLE IF NOT EXISTS loan_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financing_terms_id UUID NOT NULL REFERENCES financing_terms(id) ON DELETE CASCADE,
  rate_1 DECIMAL(10,4), -- Interest rate
  rate_2 DECIMAL(10,4), -- Second interest rate
  repayment_type_code VARCHAR(10), -- IATI LoanRepaymentType
  repayment_plan_code VARCHAR(10), -- IATI LoanRepaymentPlan
  commitment_date DATE,
  repayment_first_date DATE,
  repayment_final_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loan_terms_financing_terms_id ON loan_terms(financing_terms_id);

-- Loan status table (yearly entries)
CREATE TABLE IF NOT EXISTS loan_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financing_terms_id UUID NOT NULL REFERENCES financing_terms(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  value_date DATE,
  interest_received DECIMAL(20,2),
  principal_outstanding DECIMAL(20,2),
  principal_arrears DECIMAL(20,2),
  interest_arrears DECIMAL(20,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(financing_terms_id, year)
);

CREATE INDEX IF NOT EXISTS idx_loan_statuses_financing_terms_id ON loan_statuses(financing_terms_id);
CREATE INDEX IF NOT EXISTS idx_loan_statuses_year ON loan_statuses(year);

-- Other flags table (OECD CRS flags)
CREATE TABLE IF NOT EXISTS financing_other_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financing_terms_id UUID NOT NULL REFERENCES financing_terms(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL, -- IATI CRSOtherFlags code
  significance VARCHAR(10) DEFAULT '1', -- Significance level
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_financing_other_flags_financing_terms_id ON financing_other_flags(financing_terms_id);

-- ============================================================================
-- 9. Add comments for documentation
-- ============================================================================

COMMENT ON TABLE activity_contacts IS 'IATI contact information for activities';
COMMENT ON TABLE activity_conditions IS 'IATI conditions attached to activities';
COMMENT ON TABLE activity_budgets IS 'IATI annual budgets for activities';
COMMENT ON TABLE planned_disbursements IS 'IATI forward spending plans';
COMMENT ON TABLE activity_humanitarian_scope IS 'IATI humanitarian classification codes';
COMMENT ON TABLE activity_documents IS 'IATI activity-level document links';
COMMENT ON TABLE financing_terms IS 'IATI CRS financing terms (loan data)';
COMMENT ON TABLE loan_terms IS 'Loan repayment terms and conditions';
COMMENT ON TABLE loan_statuses IS 'Yearly loan status tracking';
COMMENT ON TABLE financing_other_flags IS 'OECD CRS additional flags';

COMMENT ON COLUMN activities.humanitarian IS 'IATI humanitarian activity flag (@humanitarian attribute)';
COMMENT ON COLUMN activities.budget_not_provided IS 'IATI flag indicating why budget is not provided (@budget-not-provided attribute)';
COMMENT ON COLUMN activities.linked_data_uri IS 'IATI linked data URI (@linked-data-uri attribute)';
COMMENT ON COLUMN activities.conditions_attached IS 'IATI flag indicating if conditions are attached';

-- ============================================================================
-- 10. Enable Row Level Security (RLS) and Create Policies
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE activity_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_humanitarian_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_other_flags ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users (adjust based on your auth setup)

-- Activity Contacts Policies
CREATE POLICY "Allow all operations on activity_contacts" ON activity_contacts FOR ALL USING (true) WITH CHECK (true);

-- Activity Conditions Policies
CREATE POLICY "Allow all operations on activity_conditions" ON activity_conditions FOR ALL USING (true) WITH CHECK (true);

-- Activity Budgets Policies
CREATE POLICY "Allow all operations on activity_budgets" ON activity_budgets FOR ALL USING (true) WITH CHECK (true);

-- Planned Disbursements Policies
CREATE POLICY "Allow all operations on planned_disbursements" ON planned_disbursements FOR ALL USING (true) WITH CHECK (true);

-- Activity Humanitarian Scope Policies
CREATE POLICY "Allow all operations on activity_humanitarian_scope" ON activity_humanitarian_scope FOR ALL USING (true) WITH CHECK (true);

-- Activity Documents Policies
CREATE POLICY "Allow all operations on activity_documents" ON activity_documents FOR ALL USING (true) WITH CHECK (true);

-- Financing Terms Policies
CREATE POLICY "Allow all operations on financing_terms" ON financing_terms FOR ALL USING (true) WITH CHECK (true);

-- Loan Terms Policies
CREATE POLICY "Allow all operations on loan_terms" ON loan_terms FOR ALL USING (true) WITH CHECK (true);

-- Loan Statuses Policies
CREATE POLICY "Allow all operations on loan_statuses" ON loan_statuses FOR ALL USING (true) WITH CHECK (true);

-- Financing Other Flags Policies
CREATE POLICY "Allow all operations on financing_other_flags" ON financing_other_flags FOR ALL USING (true) WITH CHECK (true);

