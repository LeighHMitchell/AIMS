#!/usr/bin/env node

/**
 * Apply migration to make position column nullable
 * Run with: node apply-position-migration.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🔄 Applying migration to make position column nullable...\n');

  try {
    // Check current state
    console.log('1️⃣ Checking current column state...');
    const { data: beforeCheck, error: beforeError } = await supabase
      .rpc('exec_sql', { 
        query: `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = 'activity_contacts' 
          AND table_schema = 'public'
          AND column_name = 'position';
        `
      });

    if (beforeError) {
      // Try direct query instead
      const { data: beforeData, error: directError } = await supabase
        .from('activity_contacts')
        .select('position')
        .limit(1);
      
      if (directError) {
        console.log('⚠️  Could not check current state, proceeding with migration...');
      } else {
        console.log('✓ Table exists, proceeding with migration...');
      }
    } else {
      console.log('Current state:', beforeCheck);
    }

    // Apply the migration
    console.log('\n2️⃣ Removing NOT NULL constraint from position column...');
    
    const migrationSQL = `
      ALTER TABLE public.activity_contacts 
      ALTER COLUMN position DROP NOT NULL;
    `;

    const { error: migrationError } = await supabase.rpc('exec_sql', { 
      query: migrationSQL 
    });

    if (migrationError) {
      // If rpc doesn't work, we need to do this differently
      console.log('⚠️  RPC method not available, trying alternative approach...');
      console.log('\nPlease run this SQL manually in your Supabase dashboard:');
      console.log('━'.repeat(60));
      console.log(migrationSQL);
      console.log('━'.repeat(60));
      console.log('\nTo access your Supabase dashboard:');
      console.log('1. Go to: https://app.supabase.com');
      console.log('2. Select your project');
      console.log('3. Go to SQL Editor');
      console.log('4. Paste and run the SQL above');
      process.exit(0);
    }

    console.log('✅ Migration applied successfully!');

    // Verify the change
    console.log('\n3️⃣ Verifying the change...');
    const { data: afterCheck, error: afterError } = await supabase
      .rpc('exec_sql', { 
        query: `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = 'activity_contacts' 
          AND table_schema = 'public'
          AND column_name = 'position';
        `
      });

    if (!afterError && afterCheck) {
      console.log('Updated state:', afterCheck);
      if (afterCheck[0]?.is_nullable === 'YES') {
        console.log('\n✅ SUCCESS! Position column is now nullable.');
        console.log('   Contacts can now be saved without a position/role field.');
      }
    } else {
      console.log('✅ Migration completed (verification skipped)');
    }

    console.log('\n🎉 Migration complete! You can now save contacts without a position field.');

  } catch (error) {
    console.error('\n❌ Error applying migration:', error.message);
    console.log('\n📋 Manual Migration Instructions:');
    console.log('━'.repeat(60));
    console.log('Run this SQL in your Supabase dashboard (SQL Editor):');
    console.log('\nALTER TABLE public.activity_contacts ALTER COLUMN position DROP NOT NULL;');
    console.log('━'.repeat(60));
    process.exit(1);
  }
}

runMigration();

