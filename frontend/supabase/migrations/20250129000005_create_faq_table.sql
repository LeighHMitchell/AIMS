-- FAQ Table Migration
-- Create table for storing FAQ questions and answers
-- Only super users can create, edit, and delete FAQs
-- All users can read FAQs

-- Create faq table
create table public.faq (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  answer text not null,
  category text not null default 'General',
  tags text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

-- Create index for faster queries
create index idx_faq_category on public.faq(category);
create index idx_faq_created_at on public.faq(created_at desc);
create index idx_faq_tags on public.faq using gin(tags);

-- Enable RLS
alter table public.faq enable row level security;

-- Create policies
-- Anyone can read FAQs
create policy "Anyone can read FAQs"
  on public.faq for select
  using (true);

-- Only super users can insert FAQs
create policy "Super users can insert FAQs"
  on public.faq for insert
  with check (
    exists (
      select 1 from public.users 
      where users.id = auth.uid() 
      and users.role = 'super_user'
    )
  );

-- Only super users can update FAQs
create policy "Super users can update FAQs"
  on public.faq for update
  using (
    exists (
      select 1 from public.users 
      where users.id = auth.uid() 
      and users.role = 'super_user'
    )
  )
  with check (
    exists (
      select 1 from public.users 
      where users.id = auth.uid() 
      and users.role = 'super_user'
    )
  );

-- Only super users can delete FAQs
create policy "Super users can delete FAQs"
  on public.faq for delete
  using (
    exists (
      select 1 from public.users 
      where users.id = auth.uid() 
      and users.role = 'super_user'
    )
  );

-- Function to automatically update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger update_faq_updated_at
  before update on public.faq
  for each row
  execute function public.update_updated_at_column();

-- Insert initial FAQ data
insert into public.faq (question, answer, category, tags) values
(
  'How do I create a new activity in AIMS?',
  'To create a new activity, navigate to the Activities page and click the "New Activity" button. Fill in the required fields including Activity Title, Description, Status, and Organizations. The system uses autosave, so your progress is automatically saved as you work. Once you''ve entered the basic information, you can add more details in the various tabs such as Sectors, Locations, Finances, and Documents.',
  'Activities',
  array['activities', 'create', 'new', 'getting started']
),
(
  'What is the difference between commitments and disbursements?',
  'Commitments represent the total amount of funding pledged or contracted for an activity, while disbursements are the actual payments made. Think of a commitment as a promise to pay a certain amount, and disbursements as the actual money transfers. In AIMS, you can track both types of transactions to get a complete picture of funding flows. Commitments typically happen at the beginning of a project lifecycle, while disbursements occur throughout the project implementation period.',
  'Transactions',
  array['transactions', 'commitments', 'disbursements', 'funding']
),
(
  'How do I import IATI data into AIMS?',
  'AIMS supports IATI XML import through the Import section. Navigate to Import > Organizations or Import > Activities and upload your IATI XML file. The system will validate the data and show you a preview before importing. Make sure your IATI data follows the standard schema. You can also use the IATI Sync feature in individual activities to keep them synchronized with published IATI data. For large datasets, consider using the bulk import feature.',
  'Data Management',
  array['iati', 'import', 'xml', 'data', 'sync']
),
(
  'What are the different user roles and permissions in AIMS?',
  'AIMS has several user roles with different permissions: Admin users can manage all aspects of the system including user management and system settings. Standard users can create and edit activities, organizations, and transactions. View-only users can access reports and analytics but cannot make changes. Each role can be customized with specific permissions for different data types and operations. Contact your system administrator to change user roles.',
  'User Management',
  array['users', 'roles', 'permissions', 'admin', 'access']
),
(
  'How do I generate reports and export data?',
  'AIMS provides multiple ways to export and report on your data. Use the Analytics Dashboard for visual reports and charts. The Aid Effectiveness Dashboard provides specialized development effectiveness indicators. For raw data exports, you can export activities, organizations, or transactions as CSV files from their respective list pages. Custom reports can be generated using the search functionality with specific filters, then exported. All exports respect your user permissions and data access rights.',
  'Reporting',
  array['reports', 'export', 'analytics', 'csv', 'dashboard']
),
(
  'What is the difference between Focal Points, Contacts, Contributors and Organizations?',
  'These are different types of stakeholders in AIMS, each serving distinct purposes:

**Organizations** are institutional entities like government agencies, NGOs, donors, or implementing partners that participate in development activities. They have formal roles and can be involved in multiple activities.

**Contributors** are individuals who work on or contribute to specific activities. They are linked directly to activities and represent the human resources involved in implementation. Contributors can have different roles like Project Manager, Technical Lead, or Field Coordinator.

**Contacts** are individual people associated with organizations who serve as communication points. They provide contact information (email, phone) and represent the organization in correspondence and coordination.

**Focal Points** are designated individuals who have specific responsibilities for activities or programs. They serve as primary points of accountability and decision-making for particular activities or thematic areas. A focal point is typically the go-to person for questions about a specific activity or program.

In summary: Organizations are institutions, Contributors are team members working on activities, Contacts are communication representatives for organizations, and Focal Points are designated responsible individuals for specific activities or programs.',
  'System Concepts',
  array['stakeholders', 'organizations', 'contacts', 'contributors', 'focal points', 'definitions']
),
(
  'How does the autosave feature work in the Activity Editor?',
  'AIMS includes an intelligent autosave feature that automatically saves your work as you edit activities. Here''s how it works:

**Automatic Saving**: Changes are saved automatically after you stop typing for a few seconds. You don''t need to manually click save.

**Visual Indicators**: You''ll see a save indicator showing "Saving...", "Saved", or "Error" to keep you informed of the save status.

**Field-Level Saving**: Each field saves independently, so if there''s an error in one field, it won''t prevent other fields from saving.

**Conflict Resolution**: If multiple users edit the same activity, the system will alert you to potential conflicts and help you resolve them.

**Offline Support**: If your internet connection is temporarily lost, changes are queued and will be saved automatically when the connection is restored.

The autosave feature ensures you never lose your work, even if you accidentally close your browser or lose internet connectivity.',
  'Activities',
  array['autosave', 'editor', 'saving', 'activities', 'automatic']
);
