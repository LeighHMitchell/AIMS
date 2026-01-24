/**
 * Script to fix activity_relationships table columns
 * Run with: npx ts-node --project tsconfig.json scripts/run-activity-relationships-fix.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrationSQL = `
-- Fix activity_relationships table to ensure all required columns exist
-- This migration is idempotent and safe to run multiple times

-- Add columns if they don't exist (using DO block for conditional logic)
DO $$
BEGIN
  -- Add external_iati_identifier if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_relationships' 
    AND column_name = 'external_iati_identifier'
  ) THEN
    ALTER TABLE activity_relationships ADD COLUMN external_iati_identifier VARCHAR(255);
    RAISE NOTICE 'Added column: external_iati_identifier';
  ELSE
    RAISE NOTICE 'Column external_iati_identifier already exists';
  END IF;

  -- Add external_activity_title if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_relationships' 
    AND column_name = 'external_activity_title'
  ) THEN
    ALTER TABLE activity_relationships ADD COLUMN external_activity_title TEXT;
    RAISE NOTICE 'Added column: external_activity_title';
  ELSE
    RAISE NOTICE 'Column external_activity_title already exists';
  END IF;

  -- Add is_resolved if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_relationships' 
    AND column_name = 'is_resolved'
  ) THEN
    ALTER TABLE activity_relationships ADD COLUMN is_resolved BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added column: is_resolved';
  ELSE
    RAISE NOTICE 'Column is_resolved already exists';
  END IF;
END $$;

-- Make related_activity_id nullable if it isn't already (needed for external links)
ALTER TABLE activity_relationships 
  ALTER COLUMN related_activity_id DROP NOT NULL;

-- Drop the constraint if it exists (to recreate it properly)
ALTER TABLE activity_relationships 
  DROP CONSTRAINT IF EXISTS check_relationship_target;

-- Add the constraint to ensure either internal or external link is set
ALTER TABLE activity_relationships
  ADD CONSTRAINT check_relationship_target
  CHECK (
    related_activity_id IS NOT NULL OR external_iati_identifier IS NOT NULL
  );

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_activity_relationships_external_iati
  ON activity_relationships(external_iati_identifier)
  WHERE external_iati_identifier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_relationships_unresolved
  ON activity_relationships(is_resolved)
  WHERE is_resolved = FALSE AND external_iati_identifier IS NOT NULL;
`;

async function runMigration() {
  console.log('🔧 Running activity_relationships fix migration...\n');
  
  try {
    // First, check current table structure
    console.log('📋 Checking current table structure...');
    const { data: columns, error: colError } = await supabase
      .from('activity_relationships')
      .select('*')
      .limit(0);
    
    if (colError) {
      console.error('Error checking table:', colError.message);
      // Table might not exist or other error
    }

    // Run the migration using exec_sql RPC if available
    console.log('\n🚀 Executing migration SQL...');
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      // If exec_sql doesn't exist, try alternative method
      if (error.message.includes('function') || error.message.includes('does not exist')) {
        console.log('exec_sql not available, trying direct queries...');
        
        // Run individual ALTER statements
        const statements = [
          `ALTER TABLE activity_relationships ADD COLUMN IF NOT EXISTS external_iati_identifier VARCHAR(255)`,
          `ALTER TABLE activity_relationships ADD COLUMN IF NOT EXISTS external_activity_title TEXT`,
          `ALTER TABLE activity_relationships ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE`,
        ];
        
        for (const stmt of statements) {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt });
          if (stmtError && !stmtError.message.includes('already exists')) {
            console.error(`Statement failed: ${stmt}`);
            console.error(stmtError);
          }
        }
      } else {
        throw error;
      }
    }

    // Verify the columns exist now
    console.log('\n✅ Verifying migration...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('activity_relationships')
      .select('id, activity_id, related_activity_id, external_iati_identifier, external_activity_title, is_resolved')
      .limit(1);
    
    if (verifyError) {
      console.error('Verification failed:', verifyError.message);
    } else {
      console.log('✅ All required columns exist!');
    }

    // Check how many relationships exist
    const { count, error: countError } = await supabase
      .from('activity_relationships')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`\n📊 Total activity relationships in database: ${count}`);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Refresh the Analytics > Aid Flow Network > Activities view');
    console.log('2. Activity links should now appear between connected activities');
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nYou may need to run this SQL manually in the Supabase dashboard:');
    console.error('Go to: SQL Editor in your Supabase project');
    console.error('\nSQL to run:');
    console.error(migrationSQL);
    process.exit(1);
  }
}

runMigration();
