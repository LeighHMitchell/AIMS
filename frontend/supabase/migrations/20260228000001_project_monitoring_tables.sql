-- Project Monitoring tables: schedules and reports
-- These support the /project-bank/monitoring dashboard

-- Monitoring schedules (one per monitored project)
CREATE TABLE IF NOT EXISTS project_monitoring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_bank_projects(id) ON DELETE CASCADE,
  interval_months INTEGER NOT NULL DEFAULT 6,
  next_due_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Monitoring reports (many per project, one per reporting period)
CREATE TABLE IF NOT EXISTS project_monitoring_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_bank_projects(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES project_monitoring_schedules(id) ON DELETE SET NULL,
  report_period_start DATE,
  report_period_end DATE,
  due_date DATE,
  submitted_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  compliance_status TEXT NOT NULL DEFAULT 'pending',
  submitted_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  document_id UUID,
  key_findings TEXT,
  recommendations TEXT,
  kpi_data JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_schedules_project ON project_monitoring_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_schedules_active ON project_monitoring_schedules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_monitoring_reports_project ON project_monitoring_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_reports_schedule ON project_monitoring_reports(schedule_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_reports_status ON project_monitoring_reports(status);

-- RLS
ALTER TABLE project_monitoring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_monitoring_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on project_monitoring_schedules"
  ON project_monitoring_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on project_monitoring_schedules"
  ON project_monitoring_schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on project_monitoring_schedules"
  ON project_monitoring_schedules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read on project_monitoring_reports"
  ON project_monitoring_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on project_monitoring_reports"
  ON project_monitoring_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on project_monitoring_reports"
  ON project_monitoring_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Service role full access
CREATE POLICY "Service role full access on project_monitoring_schedules"
  ON project_monitoring_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on project_monitoring_reports"
  ON project_monitoring_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
