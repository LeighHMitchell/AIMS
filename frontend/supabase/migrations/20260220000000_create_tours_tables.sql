-- Guided Spotlight Tour system: tours, steps, and user completions

-- Tours: one row per page tour
CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  route_pattern TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  role_filter TEXT[],
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tour steps: individual steps within a tour (locale for i18n)
CREATE TABLE IF NOT EXISTS tour_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  target_selector TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  placement TEXT DEFAULT 'bottom' CHECK (placement IN ('top', 'bottom', 'left', 'right')),
  locale TEXT DEFAULT 'en',
  spotlight_padding INT DEFAULT 10,
  disable_beacon BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tour_id, step_order, locale)
);

CREATE INDEX IF NOT EXISTS idx_tour_steps_tour_id ON tour_steps(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_steps_locale ON tour_steps(tour_id, locale);

-- User tour completions: per-user completion/dismissal
CREATE TABLE IF NOT EXISTS user_tour_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_slug TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed BOOLEAN DEFAULT false,
  UNIQUE(user_id, tour_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_tour_completions_user_id ON user_tour_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tour_completions_tour_slug ON user_tour_completions(tour_slug);

-- RLS
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tour_completions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read tours and steps
CREATE POLICY "Authenticated users can read tours" ON tours
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read tour_steps" ON tour_steps
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can only access their own completions
CREATE POLICY "Users can view own tour completions" ON user_tour_completions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tour completions" ON user_tour_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tour completions" ON user_tour_completions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tour completions" ON user_tour_completions
  FOR DELETE USING (auth.uid() = user_id);

-- Seed 6 tours and their steps (locale 'en')
INSERT INTO tours (slug, route_pattern, title, description, sort_order) VALUES
  ('dashboard-overview', '/dashboard', 'Dashboard Overview', 'Learn how to use your dashboard: stats, charts, and recent activity.', 1),
  ('activities-list', '/activities', 'Activity List', 'Find and filter activities, understand statuses, and create new activities.', 2),
  ('activity-editor', '/activities/new', 'Activity Editor', 'Edit activity details, sectors, locations, finances, and more.', 3),
  ('transactions', '/transactions', 'Transactions', 'View and filter financial transactions, including linked activities.', 4),
  ('organization-profile', '/organizations/*', 'Organization Profile', 'Explore organization details, activities, and analytics.', 5),
  ('bulk-import', '/iati-import', 'Bulk Import', 'Import IATI data in bulk: source, preview, rules, and history.', 6)
ON CONFLICT (slug) DO NOTHING;

-- Dashboard steps
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 1, '[data-tour="dashboard-welcome"]', 'Welcome', 'This is your dashboard. Use the tabs below to switch between Overview, Activities, Locations, and more.', 'bottom', 'en' FROM tours t WHERE t.slug = 'dashboard-overview'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 2, '[data-tour="dashboard-tabs"]', 'Tab navigation', 'Switch between Overview, My Portfolio, Activities, Locations, Aid Flows, Validation, Bookmarks, Tasks, and Notifications.', 'bottom', 'en' FROM tours t WHERE t.slug = 'dashboard-overview'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 3, '[data-tour="hero-cards"]', 'Summary cards', 'These cards show key numbers: activities, budgets, planned disbursements, transactions, and validation status. Hover for details.', 'bottom', 'en' FROM tours t WHERE t.slug = 'dashboard-overview'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 4, '[data-tour="hero-charts"]', 'Charts', 'Sectors and transaction types are shown here. Use the (?) help icons to understand what each chart represents.', 'bottom', 'en' FROM tours t WHERE t.slug = 'dashboard-overview'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 5, '[data-tour="recency-cards"]', 'Recent activity', 'See the last activity created or edited, and the last validation event. Click through to open the activity.', 'bottom', 'en' FROM tours t WHERE t.slug = 'dashboard-overview'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 6, '[data-tour="actions-required"]', 'Actions required', 'Items that need your attention: validation, updates, or other tasks.', 'bottom', 'en' FROM tours t WHERE t.slug = 'dashboard-overview'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 7, '[data-tour="org-transactions"]', 'My organisation''s transactions', 'Transactions reported by your organisation. Use filters and pagination to explore.', 'bottom', 'en' FROM tours t WHERE t.slug = 'dashboard-overview'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;

-- Activity list steps
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 1, '[data-tour="activities-header"]', 'Activity list', 'This page lists all activities you can access. Use filters and search to find specific activities.', 'bottom', 'en' FROM tours t WHERE t.slug = 'activities-list'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 2, '[data-tour="activities-filters"]', 'Filters', 'Filter by status, validation state, reported by, sector, aid type, and flow type. Use the column selector to show or hide columns.', 'bottom', 'en' FROM tours t WHERE t.slug = 'activities-list'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 3, '[data-tour="activities-table"]', 'Table', 'Each row is an activity. Click a row to open it. Sort by clicking column headers. Status and publication badges show at a glance.', 'bottom', 'en' FROM tours t WHERE t.slug = 'activities-list'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 4, '[data-tour="activities-create"]', 'Create activity', 'Click here to add a new activity. You can also use the "Add New Activity" option in the sidebar.', 'bottom', 'en' FROM tours t WHERE t.slug = 'activities-list'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 5, '[data-tour="activities-view-toggle"]', 'View mode', 'Switch between table view and card view.', 'bottom', 'en' FROM tours t WHERE t.slug = 'activities-list'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 6, '[data-tour="activities-pagination"]', 'Pagination', 'Navigate through pages of results when you have many activities.', 'top', 'en' FROM tours t WHERE t.slug = 'activities-list'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;

-- Activity editor steps
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 1, '[data-tour="editor-tabs"]', 'Editor tabs', 'Use these tabs to edit different parts of the activity: General, Sectors, Locations, Organisations, Contacts, Finances, Results, and more.', 'bottom', 'en' FROM tours t WHERE t.slug = 'activity-editor'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 2, '[data-tour="editor-title"]', 'Title and basic info', 'Enter the activity title and acronym here. These appear in lists and reports.', 'bottom', 'en' FROM tours t WHERE t.slug = 'activity-editor'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 3, '[data-tour="editor-identifier"]', 'IATI identifier', 'The IATI identifier uniquely identifies this activity in the IATI standard. It is often used for linking and reporting.', 'bottom', 'en' FROM tours t WHERE t.slug = 'activity-editor'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 4, '[data-tour="editor-dates"]', 'Dates', 'Set planned and actual start and end dates for the activity.', 'bottom', 'en' FROM tours t WHERE t.slug = 'activity-editor'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 5, '[data-tour="editor-save"]', 'Save and publish', 'Save your changes here. You can save as draft or publish when ready. Published activities may go through validation.', 'top', 'en' FROM tours t WHERE t.slug = 'activity-editor'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;

-- Transactions steps
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 1, '[data-tour="transactions-filters"]', 'Filters', 'Search and filter transactions by type, status, organisation, and finance type. Use the column selector to customise the table.', 'bottom', 'en' FROM tours t WHERE t.slug = 'transactions'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 2, '[data-tour="transactions-chart"]', 'Yearly summary', 'This chart shows transaction totals by year. Useful for spotting trends.', 'bottom', 'en' FROM tours t WHERE t.slug = 'transactions'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 3, '[data-tour="transactions-table"]', 'Transactions table', 'Each row is a transaction. "Own" means your organisation reported it; "Linked" means it comes from a linked activity. Use the source filter to narrow down.', 'bottom', 'en' FROM tours t WHERE t.slug = 'transactions'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 4, '[data-tour="transactions-pagination"]', 'Pagination', 'Move through pages when you have many transactions.', 'top', 'en' FROM tours t WHERE t.slug = 'transactions'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;

-- Organization profile steps
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 1, '[data-tour="org-header"]', 'Organization header', 'Here you see the organisation name, logo, description, and key identifiers.', 'bottom', 'en' FROM tours t WHERE t.slug = 'organization-profile'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 2, '[data-tour="org-contact"]', 'Contact info', 'Contact details and related information for this organisation.', 'left', 'en' FROM tours t WHERE t.slug = 'organization-profile'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 3, '[data-tour="org-tabs"]', 'Tabs', 'Switch between Activities, Budgets, Planned Disbursements, Transactions, Partnerships, Documents, Analytics, and Contacts.', 'bottom', 'en' FROM tours t WHERE t.slug = 'organization-profile'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 4, '[data-tour="org-actions"]', 'Actions', 'Edit the organisation profile or perform other actions from here.', 'bottom', 'en' FROM tours t WHERE t.slug = 'organization-profile'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;

-- Bulk import steps
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 1, '[data-tour="import-tabs"]', 'Bulk import', 'Use this page to import IATI data in bulk or review past imports.', 'bottom', 'en' FROM tours t WHERE t.slug = 'bulk-import'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 2, '[data-tour="import-wizard"]', 'Import wizard', 'Follow the steps: choose a source (file or URL), preview the data, set rules, then run the import. Results appear when done.', 'bottom', 'en' FROM tours t WHERE t.slug = 'bulk-import'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
INSERT INTO tour_steps (tour_id, step_order, target_selector, title, content, placement, locale)
SELECT t.id, 3, '[data-tour="import-history"]', 'History', 'See past imports, their status, and any errors. Use filters to find a specific run.', 'bottom', 'en' FROM tours t WHERE t.slug = 'bulk-import'
ON CONFLICT (tour_id, step_order, locale) DO NOTHING;
