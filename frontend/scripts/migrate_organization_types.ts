import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function migrateOrganizationTypes() {
  console.log('Starting organization types migration...\n');

  try {
    // Read the migration SQL file
    const sqlPath = path.join(__dirname, '../migrate_to_iati_organization_types.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf-8');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    // Verify the migration
    const { data: orgTypes, error: verifyError } = await supabase
      .from('organization_types')
      .select('*')
      .order('sort_order');

    if (verifyError) {
      console.error('Verification failed:', verifyError);
      process.exit(1);
    }

    console.log('Migration completed successfully!\n');
    console.log('New organization types:');
    orgTypes.forEach(type => {
      console.log(`${type.code}: ${type.label} (${type.description})`);
    });

    // Check for organizations that need review
    const { data: reviewNeeded, error: reviewError } = await supabase
      .from('organization_type_migration_log')
      .select('*')
      .eq('needs_review', true);

    if (reviewError) {
      console.error('Failed to fetch review list:', reviewError);
    } else if (reviewNeeded && reviewNeeded.length > 0) {
      console.log('\nOrganizations that need review:');
      reviewNeeded.forEach(org => {
        console.log(`- ID: ${org.organization_id}, Old Type: ${org.old_type}, Country: ${org.country}`);
      });
    } else {
      console.log('\nNo organizations need review.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateOrganizationTypes(); 