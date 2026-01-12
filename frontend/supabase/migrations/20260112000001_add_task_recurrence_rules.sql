-- =====================================================
-- TASK RECURRENCE RULES
-- RRULE-style scheduling configuration for recurring tasks
-- =====================================================

-- =====================================================
-- 1. TASK_RECURRENCE_RULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS task_recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Frequency settings (RRULE-style)
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  interval INTEGER DEFAULT 1 CHECK (interval > 0), -- Every N periods

  -- Day-of-week specification (for weekly)
  -- Array of: 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'
  by_weekday TEXT[] CHECK (
    by_weekday IS NULL OR
    by_weekday <@ ARRAY['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  ),

  -- Day-of-month specification (for monthly/yearly)
  -- Array of integers 1-31 or negative (-1 = last day, -2 = second to last, etc.)
  by_month_day INTEGER[] CHECK (
    by_month_day IS NULL OR
    (
      array_length(by_month_day, 1) > 0 AND
      by_month_day <@ ARRAY[-31,-30,-29,-28,-27,-26,-25,-24,-23,-22,-21,-20,-19,-18,-17,-16,-15,-14,-13,-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31]
    )
  ),

  -- Month specification (for yearly)
  -- Array of integers 1-12
  by_month INTEGER[] CHECK (
    by_month IS NULL OR
    by_month <@ ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  ),

  -- Termination conditions (mutually exclusive or both null for infinite)
  count INTEGER CHECK (count IS NULL OR count > 0), -- Max number of occurrences
  end_date TIMESTAMPTZ, -- End after this date

  -- Timezone for scheduling calculations
  timezone TEXT DEFAULT 'UTC',

  -- Time of day to generate (hour:minute in 24h format)
  generation_time TIME DEFAULT '09:00:00',

  -- Tracking fields
  last_generated_at TIMESTAMPTZ,
  next_occurrence_at TIMESTAMPTZ,
  occurrences_generated INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES
-- =====================================================
-- Index for finding rules that need processing
CREATE INDEX idx_recurrence_next_occurrence
  ON task_recurrence_rules(next_occurrence_at)
  WHERE is_active = TRUE AND next_occurrence_at IS NOT NULL;

-- Index for active rules
CREATE INDEX idx_recurrence_is_active
  ON task_recurrence_rules(is_active)
  WHERE is_active = TRUE;

-- Index by frequency for analytics
CREATE INDEX idx_recurrence_frequency ON task_recurrence_rules(frequency);

-- =====================================================
-- 3. ENABLE RLS
-- =====================================================
ALTER TABLE task_recurrence_rules ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES
-- Note: Policies that reference tasks.recurrence_id are added in
-- migration 20260112000002_expand_tasks_table.sql after the column exists
-- =====================================================

-- Super users can view all recurrence rules
CREATE POLICY "Super users can view all recurrence rules"
  ON task_recurrence_rules FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
  );

-- Service role can insert (via API)
CREATE POLICY "Service can create recurrence rules"
  ON task_recurrence_rules FOR INSERT
  WITH CHECK (true);

-- Service role can update (via cron jobs)
CREATE POLICY "Service can update recurrence rules"
  ON task_recurrence_rules FOR UPDATE
  USING (true);

-- Super users can delete any recurrence rule
CREATE POLICY "Super users can delete any recurrence rule"
  ON task_recurrence_rules FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_user')
  );

-- =====================================================
-- 5. UPDATED_AT TRIGGER
-- =====================================================
CREATE TRIGGER update_task_recurrence_rules_updated_at
  BEFORE UPDATE ON task_recurrence_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- =====================================================
-- 6. HELPER FUNCTION: Calculate Next Occurrence
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_next_recurrence(
  p_rule_id UUID,
  p_from_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  v_rule task_recurrence_rules%ROWTYPE;
  v_next_date TIMESTAMPTZ;
  v_interval_text TEXT;
BEGIN
  -- Get the rule
  SELECT * INTO v_rule FROM task_recurrence_rules WHERE id = p_rule_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Check if rule has ended
  IF v_rule.end_date IS NOT NULL AND v_rule.end_date < p_from_date THEN
    RETURN NULL;
  END IF;

  IF v_rule.count IS NOT NULL AND v_rule.occurrences_generated >= v_rule.count THEN
    RETURN NULL;
  END IF;

  -- Calculate based on frequency
  -- Note: This is a simplified calculation. More complex RRULE logic
  -- (like by_weekday, by_month_day) should be handled in application code
  CASE v_rule.frequency
    WHEN 'daily' THEN
      v_interval_text := v_rule.interval || ' days';
    WHEN 'weekly' THEN
      v_interval_text := (v_rule.interval * 7) || ' days';
    WHEN 'monthly' THEN
      v_interval_text := v_rule.interval || ' months';
    WHEN 'quarterly' THEN
      v_interval_text := (v_rule.interval * 3) || ' months';
    WHEN 'yearly' THEN
      v_interval_text := v_rule.interval || ' years';
  END CASE;

  -- Calculate from last generated or from_date
  IF v_rule.last_generated_at IS NOT NULL THEN
    v_next_date := v_rule.last_generated_at + v_interval_text::INTERVAL;
  ELSE
    v_next_date := p_from_date;
  END IF;

  -- Apply generation time
  v_next_date := date_trunc('day', v_next_date AT TIME ZONE v_rule.timezone)
    + v_rule.generation_time
    AT TIME ZONE v_rule.timezone;

  -- Check end date
  IF v_rule.end_date IS NOT NULL AND v_next_date > v_rule.end_date THEN
    RETURN NULL;
  END IF;

  RETURN v_next_date;
END;
$$;

-- =====================================================
-- 7. COMMENTS
-- =====================================================
COMMENT ON TABLE task_recurrence_rules IS 'RRULE-style recurrence configuration for recurring tasks';
COMMENT ON COLUMN task_recurrence_rules.frequency IS 'Base frequency: daily, weekly, monthly, quarterly, yearly';
COMMENT ON COLUMN task_recurrence_rules.interval IS 'Every N periods (e.g., interval=2 with weekly = every 2 weeks)';
COMMENT ON COLUMN task_recurrence_rules.by_weekday IS 'Days of week for weekly frequency: MO, TU, WE, TH, FR, SA, SU';
COMMENT ON COLUMN task_recurrence_rules.by_month_day IS 'Days of month for monthly/yearly: 1-31 or negative for end-relative';
COMMENT ON COLUMN task_recurrence_rules.by_month IS 'Months for yearly frequency: 1-12';
COMMENT ON COLUMN task_recurrence_rules.count IS 'Stop after this many occurrences (null = infinite)';
COMMENT ON COLUMN task_recurrence_rules.end_date IS 'Stop generating after this date';
COMMENT ON COLUMN task_recurrence_rules.timezone IS 'Timezone for scheduling calculations';
COMMENT ON COLUMN task_recurrence_rules.generation_time IS 'Time of day to generate/dispatch tasks';
COMMENT ON COLUMN task_recurrence_rules.next_occurrence_at IS 'Pre-calculated next occurrence for efficient cron queries';
COMMENT ON FUNCTION calculate_next_recurrence IS 'Calculate the next occurrence date for a recurrence rule';
