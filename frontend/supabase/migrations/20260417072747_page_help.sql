-- Contextual Page Help Widget: schema + seed content.

CREATE TABLE IF NOT EXISTS public.page_help_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug text NOT NULL,
  question text NOT NULL CHECK (char_length(question) <= 200),
  answer text NOT NULL CHECK (char_length(answer) <= 2000),
  display_order int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_help_content_lookup_idx
  ON public.page_help_content (page_slug, published, display_order);

DROP TRIGGER IF EXISTS page_help_content_updated_at ON public.page_help_content;
CREATE TRIGGER page_help_content_updated_at
  BEFORE UPDATE ON public.page_help_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.page_help_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "page_help_content_read_published" ON public.page_help_content;
CREATE POLICY "page_help_content_read_published"
  ON public.page_help_content
  FOR SELECT
  TO authenticated
  USING (published = true);

DROP POLICY IF EXISTS "page_help_content_read_all_super" ON public.page_help_content;
CREATE POLICY "page_help_content_read_all_super"
  ON public.page_help_content
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_user'));

DROP POLICY IF EXISTS "page_help_content_write_super" ON public.page_help_content;
CREATE POLICY "page_help_content_write_super"
  ON public.page_help_content
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_user'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_user'));

ALTER TABLE public.faq_questions ADD COLUMN IF NOT EXISTS source_page_slug text;
ALTER TABLE public.faq_questions ADD COLUMN IF NOT EXISTS source_page_title text;

CREATE INDEX IF NOT EXISTS faq_questions_source_page_slug_idx
  ON public.faq_questions (source_page_slug)
  WHERE source_page_slug IS NOT NULL;

INSERT INTO public.page_help_content (page_slug, question, answer, display_order, published) VALUES
  ('activities', 'What is this page for?', 'This is the Activity List - the central register of every aid activity tracked in the system. Each row represents one project, programme, or intervention reported to this aid information management system.', 1, false),
  ('activities', 'Why does it matter?', 'Activities are the atomic unit of aid transparency. Everything - transactions, budgets, sectors, organisations - ultimately rolls up to an activity. Keeping this register complete and accurate is what makes reporting to IATI and domestic stakeholders possible.', 2, false),
  ('activities', 'What can I do here?', '- Filter and search activities by organisation, sector, status, date or free text. - Export the filtered set to CSV or IATI XML. - Open any activity to view or edit its details. - Create a new activity via the button at the top right.', 3, false),
  ('activities', 'How do I find a specific activity?', 'Use the search box for free-text matching on title or IATI identifier, or open the filter panel to narrow by reporting organisation, implementing partner, sector, country, or status. Filters combine with AND logic.', 4, false),
  ('activities', 'What do the status badges mean?', 'Status reflects the IATI activity-status codelist: Pipeline, Implementation, Finalisation, Closed, Cancelled, Suspended. Use the Publication Status column to see whether the activity is a public-facing record or still a working draft.', 5, false),
  ('activities/new', 'What is this page for?', 'This is the Activity Editor - where you enter or update every piece of information about a single activity: identifiers, dates, participating organisations, finances, sectors, locations, results, and more. It is organised into tabs on the left.', 1, false),
  ('activities/new', 'Why does it matter?', 'The quality of everything downstream - dashboards, exports, IATI publication, compliance checks - depends on what is captured here. Complete, consistent activity records are the backbone of aid transparency.', 2, false),
  ('activities/new', 'What can I do here?', '- Fill out each tab in the left-hand nav (General, Sectors, Finances, etc.). - Save progress at any time - the record is auto-saved as a draft. - Publish the activity when you are ready for it to appear in the public register. - Import an IATI XML file to prefill fields.', 3, false),
  ('activities/new', 'Do I have to fill in every field?', 'No. Required IATI fields are marked with a small red dot. Other fields improve data quality and downstream usability but are optional. The completeness indicator at the top of the page shows your current coverage.', 4, false),
  ('activities/new', 'How do I know my changes are saved?', 'The editor auto-saves as you type. Look for the Saved indicator near the top of each tab - it shows the last successful save timestamp. If a save fails you will see a red warning with the error and a retry button.', 5, false),
  ('organizations', 'What is this page for?', 'This is the Organisations register - every donor, implementing partner, government body, NGO and private-sector actor referenced anywhere in the system lives here. Organisations are reused across activities to prevent duplication.', 1, false),
  ('organizations', 'Why does it matter?', 'Consistent organisation records enable accurate attribution of funding flows. If the same donor is entered three different ways across three activities, totals become unreliable and reports misleading.', 2, false),
  ('organizations', 'What can I do here?', '- Search and filter organisations by type, country or custom group. - Switch between grid and table views. - Create a new organisation via the button at the top right. - Open any organisation to view its activities, contacts and relationships.', 3, false),
  ('organizations', 'How do I avoid creating duplicates?', 'Before creating a new organisation, search for it by name and any known IATI identifier or acronym. If you find a close match, open that record and add the missing detail instead of creating a new one. When in doubt, ask a super-user to merge duplicates.', 4, false),
  ('organizations', 'What are custom groups?', 'Custom groups let you tag organisations with your own labels and filter by them later. They are additive to the standard IATI organisation type.', 5, false);
