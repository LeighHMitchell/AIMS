import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixGizAcronym() {
  console.log('🔧 Fixing GIZ organization acronym...\n');

  try {
    // First, find the GIZ organization
    const { data: gizOrg, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .ilike('name', '%Deutsche Gesellschaft%')
      .single();

    if (fetchError) {
      console.error('Error fetching GIZ organization:', fetchError);
      return;
    }

    if (!gizOrg) {
      console.log('GIZ organization not found');
      return;
    }

    console.log('Current GIZ organization data:');
    console.log(`  ID: ${gizOrg.id}`);
    console.log(`  Name: ${gizOrg.name}`);
    console.log(`  Acronym: ${gizOrg.acronym || '(not set)'}`);
    console.log(`  Type: ${gizOrg.type}`);

    // Check if acronym is already set correctly
    if (gizOrg.acronym === 'GIZ') {
      console.log('\n✅ Acronym is already set correctly to "GIZ"');
      
      // Let's also check a user with this organization to see what they have
      const { data: sampleUser } = await supabase
        .from('users')
        .select('email, organization_id')
        .eq('organization_id', gizOrg.id)
        .limit(1)
        .single();
      
      if (sampleUser) {
        console.log(`\nSample user with GIZ organization: ${sampleUser.email}`);
      }
      
      return;
    }

    // Update the acronym
    console.log('\n📝 Updating GIZ acronym...');
    
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ 
        acronym: 'GIZ',
        name: 'Deutsche Gesellschaft für Internationale Zusammenarbeit' // Ensure name doesn't include acronym
      })
      .eq('id', gizOrg.id);

    if (updateError) {
      console.error('Error updating GIZ acronym:', updateError);
      return;
    }

    console.log('✅ Successfully updated GIZ organization with acronym "GIZ"');

    // Verify the update
    const { data: updatedOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', gizOrg.id)
      .single();

    if (updatedOrg) {
      console.log('\nUpdated organization data:');
      console.log(`  Name: ${updatedOrg.name}`);
      console.log(`  Acronym: ${updatedOrg.acronym}`);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the fix
fixGizAcronym();