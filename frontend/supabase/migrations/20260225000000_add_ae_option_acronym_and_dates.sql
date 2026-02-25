-- Add acronym and date fields to aid_effectiveness_options
ALTER TABLE aid_effectiveness_options
  ADD COLUMN IF NOT EXISTS acronym VARCHAR(50),
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS start_date_precision VARCHAR(10),
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS end_date_precision VARCHAR(10);

-- Constrain precision values
ALTER TABLE aid_effectiveness_options
  ADD CONSTRAINT chk_start_date_precision
    CHECK (start_date_precision IS NULL OR start_date_precision IN ('year', 'month', 'day'));

ALTER TABLE aid_effectiveness_options
  ADD CONSTRAINT chk_end_date_precision
    CHECK (end_date_precision IS NULL OR end_date_precision IN ('year', 'month', 'day'));
