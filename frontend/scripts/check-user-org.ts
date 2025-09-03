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

async function checkUserOrg() {
  console.log('🔍 Checking user organization data...\n');

  try {
    // Check for user with email leigh.h.mitchell@icloud.com
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        email,
        first_name,
        last_name,
        organization_id,
        organisations:organization_id (
          id,
          name,
          acronym,
          type
        )
      `)
      .eq('email', 'leigh.h.mitchell@icloud.com')
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return;
    }

    if (!userData) {
      console.log('User not found');
      return;
    }

    console.log('User data:');
    console.log(`  Email: ${userData.email}`);
    console.log(`  Name: ${userData.first_name} ${userData.last_name}`);
    console.log(`  Organization ID: ${userData.organization_id}`);
    
    if (userData.organisations) {
      console.log('\nOrganization data from join:');
      console.log(`  ID: ${(userData.organisations as any).id}`);
      console.log(`  Name: ${(userData.organisations as any).name}`);
      console.log(`  Acronym: ${(userData.organisations as any).acronym || '(not set)'}`);
      console.log(`  Type: ${(userData.organisations as any).type}`);
    } else {
      console.log('\nNo organization data found in join');
    }

    // Also check the organization directly
    if (userData.organization_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userData.organization_id)
        .single();
      
      if (orgData) {
        console.log('\nDirect organization query:');
        console.log(`  Name: ${orgData.name}`);
        console.log(`  Acronym: ${orgData.acronym || '(not set)'}`);
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the check
checkUserOrg();