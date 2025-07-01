# Supabase Setup Guide for AIMS Project

## Overview
This guide will help you set up Supabase as the backend database for your AIMS project, replacing the current file-based storage system.

## Quick Setup for Environment Variables

Create a `.env.local` file in your frontend directory:

```bash
cd frontend
touch .env.local
```

Add these lines to `.env.local`:
```
# Supabase Configuration
# Get these values from your Supabase project dashboard: Settings > API

# Your Supabase project URL (looks like https://xxxxx.supabase.co)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co

# Your Supabase anonymous key (safe for client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE

# Your Supabase service role key (keep secret, server-side only)
# WARNING: Never expose this key to the client/browser
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

**Important**: Make sure `.env.local` is in your `.gitignore` file to prevent accidentally committing your API keys.

## 1. Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub or email
4. Create a new project:
   - Project name: `aims-project` (or your preference)
   - Database Password: Generate a strong password and save it
   - Region: Choose the closest to your location
   - Pricing plan: Free tier is fine for development

## 2. Database Schema Setup

Once your project is created, go to the SQL Editor in your Supabase dashboard and run these queries to create your tables:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    country TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_user', 'admin', 'member', 'viewer')),
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partners table
CREATE TABLE partners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    country TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table
CREATE TABLE activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    partner_id UUID REFERENCES partners(id),
    iati_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    objectives TEXT,
    target_groups TEXT,
    collaboration_type TEXT,
    activity_status TEXT DEFAULT 'planning',
    publication_status TEXT DEFAULT 'draft',
    submission_status TEXT DEFAULT 'draft',
    banner TEXT, -- Base64 encoded image
    created_by_org UUID REFERENCES organizations(id),
    
    -- Dates
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    
    -- Workflow fields
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMPTZ,
    validated_by UUID REFERENCES users(id),
    validated_at TIMESTAMPTZ,
    published_by UUID REFERENCES users(id),
    published_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES users(id),
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Tracking fields
    created_by UUID REFERENCES users(id),
    last_edited_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity sectors table (many-to-many)
CREATE TABLE activity_sectors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    sector_code TEXT NOT NULL,
    sector_name TEXT NOT NULL,
    percentage DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    transaction_type TEXT NOT NULL,
    provider_org TEXT,
    receiver_org TEXT,
    value DECIMAL(15,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    transaction_date DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity comments table
CREATE TABLE activity_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    type TEXT DEFAULT 'comment' CHECK (type IN ('comment', 'query', 'response')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity contributors table (for multi-partner collaboration)
CREATE TABLE activity_contributors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    status TEXT DEFAULT 'nominated' CHECK (status IN ('nominated', 'accepted', 'declined', 'requested')),
    nominated_by UUID REFERENCES users(id),
    nominated_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    can_edit_own_data BOOLEAN DEFAULT true,
    can_view_other_drafts BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    activity_id UUID REFERENCES activities(id),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'active',
    organization_id UUID REFERENCES organizations(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SDG Goals reference table
CREATE TABLE sdg_goals (
    id INTEGER PRIMARY KEY, -- 1 to 17
    goal_name TEXT NOT NULL,
    goal_description TEXT NOT NULL,
    icon_url TEXT, -- link to official SDG icon
    color_hex TEXT -- for UI theming
);

-- SDG Targets reference table
CREATE TABLE sdg_targets (
    id TEXT PRIMARY KEY, -- e.g. "5.2"
    goal_number INTEGER NOT NULL REFERENCES sdg_goals(id),
    target_text TEXT NOT NULL,
    target_description TEXT NOT NULL
);

-- Activity SDG mappings table
CREATE TABLE activity_sdg_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    sdg_goal INTEGER CHECK (sdg_goal BETWEEN 1 AND 17) NOT NULL REFERENCES sdg_goals(id),
    sdg_target TEXT NOT NULL REFERENCES sdg_targets(id),
    contribution_percent NUMERIC CHECK (contribution_percent >= 0 AND contribution_percent <= 100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_activities_partner_id ON activities(partner_id);
CREATE INDEX idx_activities_created_by_org ON activities(created_by_org);
CREATE INDEX idx_transactions_activity_id ON transactions(activity_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_activity_id ON activity_logs(activity_id);
CREATE INDEX idx_activity_sdg_mappings_activity_id ON activity_sdg_mappings(activity_id);
CREATE INDEX idx_activity_sdg_mappings_sdg_goal ON activity_sdg_mappings(sdg_goal);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_sdg_mappings_updated_at BEFORE UPDATE ON activity_sdg_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 2.1 Populate SDG Reference Data

After creating the tables, run this SQL to populate the SDG reference data:

```sql
-- Insert SDG Goals
INSERT INTO sdg_goals (id, goal_name, goal_description, color_hex) VALUES
(1, 'No Poverty', 'End poverty in all its forms everywhere', '#E5243B'),
(2, 'Zero Hunger', 'End hunger, achieve food security and improved nutrition and promote sustainable agriculture', '#DDA63A'),
(3, 'Good Health and Well-being', 'Ensure healthy lives and promote well-being for all at all ages', '#4C9F38'),
(4, 'Quality Education', 'Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all', '#C5192D'),
(5, 'Gender Equality', 'Achieve gender equality and empower all women and girls', '#FF3A21'),
(6, 'Clean Water and Sanitation', 'Ensure availability and sustainable management of water and sanitation for all', '#26BDE2'),
(7, 'Affordable and Clean Energy', 'Ensure access to affordable, reliable, sustainable and modern energy for all', '#FCC30B'),
(8, 'Decent Work and Economic Growth', 'Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all', '#A21942'),
(9, 'Industry, Innovation and Infrastructure', 'Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation', '#FD6925'),
(10, 'Reduced Inequalities', 'Reduce inequality within and among countries', '#DD1367'),
(11, 'Sustainable Cities and Communities', 'Make cities and human settlements inclusive, safe, resilient and sustainable', '#FD9D24'),
(12, 'Responsible Consumption and Production', 'Ensure sustainable consumption and production patterns', '#BF8B2E'),
(13, 'Climate Action', 'Take urgent action to combat climate change and its impacts', '#3F7E44'),
(14, 'Life Below Water', 'Conserve and sustainably use the oceans, seas and marine resources for sustainable development', '#0A97D9'),
(15, 'Life on Land', 'Protect, restore and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification, and halt and reverse land degradation and halt biodiversity loss', '#56C02B'),
(16, 'Peace, Justice and Strong Institutions', 'Promote peaceful and inclusive societies for sustainable development, provide access to justice for all and build effective, accountable and inclusive institutions at all levels', '#00689D'),
(17, 'Partnerships for the Goals', 'Strengthen the means of implementation and revitalize the Global Partnership for Sustainable Development', '#19486A');

-- Insert sample SDG targets (you can add more as needed)
INSERT INTO sdg_targets (id, goal_number, target_text, target_description) VALUES
-- Goal 1 targets
('1.1', 1, 'Eradicate extreme poverty', 'By 2030, eradicate extreme poverty for all people everywhere, currently measured as people living on less than $1.25 a day'),
('1.2', 1, 'Reduce poverty by half', 'By 2030, reduce at least by half the proportion of men, women and children of all ages living in poverty in all its dimensions according to national definitions'),
('1.3', 1, 'Social protection systems', 'Implement nationally appropriate social protection systems and measures for all, including floors, and by 2030 achieve substantial coverage of the poor and the vulnerable'),
('1.4', 1, 'Equal rights to resources', 'By 2030, ensure that all men and women, in particular the poor and the vulnerable, have equal rights to economic resources, as well as access to basic services, ownership and control over land and other forms of property, inheritance, natural resources, appropriate new technology and financial services, including microfinance'),
('1.5', 1, 'Build resilience', 'By 2030, build the resilience of the poor and those in vulnerable situations and reduce their exposure and vulnerability to climate-related extreme events and other economic, social and environmental shocks and disasters'),

-- Goal 5 targets (Gender Equality examples)
('5.1', 5, 'End discrimination', 'End all forms of discrimination against all women and girls everywhere'),
('5.2', 5, 'Eliminate violence', 'Eliminate all forms of violence against all women and girls in the public and private spheres, including trafficking and sexual and other types of exploitation'),
('5.3', 5, 'Eliminate harmful practices', 'Eliminate all harmful practices, such as child, early and forced marriage and female genital mutilation'),
('5.4', 5, 'Value unpaid care', 'Recognize and value unpaid care and domestic work through the provision of public services, infrastructure and social protection policies and the promotion of shared responsibility within the household and the family as nationally appropriate'),
('5.5', 5, 'Women''s participation', 'Ensure women''s full and effective participation and equal opportunities for leadership at all levels of decision-making in political, economic and public life'),

-- Goal 13 targets (Climate Action examples)
('13.1', 13, 'Strengthen resilience', 'Strengthen resilience and adaptive capacity to climate-related hazards and natural disasters in all countries'),
('13.2', 13, 'Integrate climate measures', 'Integrate climate change measures into national policies, strategies and planning'),
('13.3', 13, 'Climate education', 'Improve education, awareness-raising and human and institutional capacity on climate change mitigation, adaptation, impact reduction and early warning');

-- Note: You can find the complete list of all 169 SDG targets from the UN website and add them as needed
```

## 3. Enable Row Level Security (RLS)

Run these queries to enable RLS for better security:

```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdg_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdg_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sdg_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your needs)
-- For now, we'll create permissive policies for development
CREATE POLICY "Enable all operations for authenticated users" ON organizations
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON partners
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON activities
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON transactions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON activity_comments
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON activity_contributors
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON activity_logs
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON projects
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON sdg_goals
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON sdg_targets
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON activity_sdg_mappings
    FOR ALL USING (true) WITH CHECK (true);
```

## 4. Get Your API Keys

1. In your Supabase dashboard, go to Settings > API
2. Copy these values:
   - Project URL (looks like `https://xxxxx.supabase.co`)
   - anon/public key (safe for client-side)
   - service_role key (keep secret, server-side only)

## 5. Environment Variables

Create `.env.local` file in your frontend directory with:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

## 6. Install Dependencies

```bash
cd frontend
npm install @supabase/supabase-js
```

## 7. Next Steps

After setting up Supabase:
1. Create a Supabase client utility
2. Update API routes to use Supabase instead of file storage
3. Implement authentication
4. Migrate existing data

## Data Migration

To migrate your existing JSON data to Supabase:
1. Export your current data from the JSON files
2. Transform it to match the new schema
3. Use Supabase's import tools or write a migration script

## Security Considerations

1. Never expose your service_role key to the client
2. Use Row Level Security (RLS) policies
3. Implement proper authentication
4. Validate all inputs on the server side
5. Use environment variables for sensitive data 