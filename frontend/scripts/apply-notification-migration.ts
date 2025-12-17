/**
 * Apply the user_notifications table migration
 * Run with: npx tsx scripts/apply-notification-migration.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Applying user_notifications migration...');

  // Check if table already exists
  const { data: existingTable } = await supabase
    .from('user_notifications')
    .select('id')
    .limit(1);

  if (existingTable !== null) {
    console.log('Table user_notifications already exists, skipping creation');
    return;
  }

  // Run the migration SQL via rpc or direct query
  const migrationSQL = `
    CREATE TABLE IF NOT EXISTS user_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      metadata JSONB DEFAULT '{}',
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);
    CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

    ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Users can view own notifications') THEN
        CREATE POLICY "Users can view own notifications"
          ON user_notifications FOR SELECT
          USING (auth.uid() = user_id);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Users can update own notifications') THEN
        CREATE POLICY "Users can update own notifications"
          ON user_notifications FOR UPDATE
          USING (auth.uid() = user_id);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Service can insert notifications') THEN
        CREATE POLICY "Service can insert notifications"
          ON user_notifications FOR INSERT
          WITH CHECK (true);
      END IF;
    END $$;
  `;

  // Use the SQL editor API or run via psql
  console.log('Migration SQL prepared. Please run this in the Supabase SQL editor:');
  console.log('---');
  console.log(migrationSQL);
  console.log('---');
}

applyMigration().catch(console.error);
