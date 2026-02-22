-- Add responsible_ministries JSONB column to aid_effectiveness_options
ALTER TABLE aid_effectiveness_options
  ADD COLUMN IF NOT EXISTS responsible_ministries JSONB DEFAULT '[]'::jsonb;

-- Junction table: ae_option_ministries
CREATE TABLE IF NOT EXISTS ae_option_ministries (
  ae_option_id UUID NOT NULL REFERENCES aid_effectiveness_options(id) ON DELETE CASCADE,
  budget_classification_id UUID NOT NULL REFERENCES budget_classifications(id) ON DELETE CASCADE,
  PRIMARY KEY (ae_option_id, budget_classification_id)
);

-- RLS
ALTER TABLE ae_option_ministries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ae_option_ministries_select" ON ae_option_ministries
  FOR SELECT USING (true);

CREATE POLICY "ae_option_ministries_insert" ON ae_option_ministries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "ae_option_ministries_update" ON ae_option_ministries
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "ae_option_ministries_delete" ON ae_option_ministries
  FOR DELETE USING (auth.role() = 'authenticated');
