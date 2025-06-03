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

-- Create indexes for better performance
CREATE INDEX idx_activities_partner_id ON activities(partner_id);
CREATE INDEX idx_activities_created_by_org ON activities(created_by_org);
CREATE INDEX idx_transactions_activity_id ON transactions(activity_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_activity_id ON activity_logs(activity_id);

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