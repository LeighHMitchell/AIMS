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

async function testLoginDataFlow() {
  console.log('🔍 Testing login data flow for user...\n');

  try {
    // Simulate what the login API does
    const userEmail = 'leigh.h.mitchell@icloud.com';
    
    // 1. Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      return;
    }

    console.log('Step 1 - User data fetched:');
    console.log(`  Organization ID: ${userData.organization_id}`);

    // 2. Get organization data (like login API does)
    let organization = null;
    if (userData.organization_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userData.organization_id)
        .single();
      
      organization = orgData;
    }

    console.log('\nStep 2 - Organization fetched:');
    if (organization) {
      console.log(`  Name: ${organization.name}`);
      console.log(`  Acronym: ${organization.acronym}`);
      console.log(`  All fields:`, Object.keys(organization));
    }

    // 3. Build user object like login API
    const user = {
      id: userData.id,
      name: userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Unknown User',
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      email: userData.email,
      title: userData.title || '',
      jobTitle: userData.job_title || userData.title || '',
      role: userData.role,
      organizationId: userData.organization_id,
      organisation: organization?.name || '',
      organization: organization, // This should have the acronym
      profilePicture: userData.avatar_url,
      phone: userData.phone || '',
      telephone: userData.telephone || userData.phone || '',
      isActive: userData.is_active !== false,
      lastLogin: new Date().toISOString(),
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    };

    console.log('\nStep 3 - Final user object:');
    console.log(`  user.organisation: ${user.organisation}`);
    console.log(`  user.organization?.name: ${user.organization?.name}`);
    console.log(`  user.organization?.acronym: ${user.organization?.acronym}`);

    // 4. What TopNav would display
    const displayOrg = user.organization?.name || user.organisation || 'No Organization';
    const displayAcronym = user.organization?.acronym ? ` (${user.organization.acronym})` : '';
    
    console.log('\nStep 4 - What TopNav should display:');
    console.log(`  Organization text: "${displayOrg}${displayAcronym}"`);

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testLoginDataFlow();