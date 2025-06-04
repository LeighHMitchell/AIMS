import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

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

// Mock organizations data (without IDs - let Supabase generate them)
const mockOrganizations = [
  { name: "World Bank", type: "development_partner", country: "USA" },
  { name: "UNDP", type: "development_partner", country: "USA" },
  { name: "Ministry of Finance", type: "partner_government", country: "RW" },
  { name: "Ministry of Education", type: "partner_government", country: "RW" },
];

async function migrateData() {
  console.log('Starting migration of users and organizations to Supabase...\n');
  
  // First, check if data already exists
  const { data: existingOrgs } = await supabase.from('organizations').select('id');
  const { data: existingUsers } = await supabase.from('users').select('id');
  
  let orgMapping: Record<string, string> = {};
  
  if (existingOrgs && existingOrgs.length > 0) {
    console.log('⚠️  Organizations already exist in database. Skipping organization migration.');
    // Get existing organizations for mapping
    const { data: orgs } = await supabase.from('organizations').select('*');
    if (orgs) {
      orgMapping = {
        "World Bank": orgs.find(o => o.name === "World Bank")?.id,
        "UNDP": orgs.find(o => o.name === "UNDP")?.id,
        "Ministry of Finance": orgs.find(o => o.name === "Ministry of Finance")?.id,
        "Ministry of Education": orgs.find(o => o.name === "Ministry of Education")?.id,
      };
    }
  } else {
    // Migrate organizations
    console.log('📦 Migrating organizations...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .insert(mockOrganizations)
      .select();
    
    if (orgError) {
      console.error('❌ Error migrating organizations:', orgError);
      return;
    }
    console.log(`✅ Migrated ${orgs?.length || 0} organizations\n`);
    
    // Create mapping of organization names to IDs
    if (orgs) {
      orgs.forEach(org => {
        orgMapping[org.name] = org.id;
      });
    }
  }
  
  if (existingUsers && existingUsers.length > 0) {
    console.log('⚠️  Users already exist in database. Skipping user migration.');
  } else {
    // Mock users data with organization mapping
    const mockUsers = [
      {
        name: "John Doe",
        email: "john@example.com",
        role: "super_user",
        organization_id: orgMapping["World Bank"],
      },
      {
        name: "Jane Smith",
        email: "jane@worldbank.org",
        role: "admin",
        organization_id: orgMapping["World Bank"],
      },
      {
        name: "Mike Johnson",
        email: "mike@undp.org",
        role: "member",
        organization_id: orgMapping["UNDP"],
      },
      {
        name: "Sarah Williams",
        email: "sarah@mof.gov",
        role: "admin",
        organization_id: orgMapping["Ministry of Finance"],
      },
      {
        name: "Tom Brown",
        email: "tom@moe.gov",
        role: "member",
        organization_id: orgMapping["Ministry of Education"],
      },
      {
        name: "Emily Davis",
        email: "emily@example.com",
        role: "viewer",
        organization_id: null,
      },
      {
        name: "David Wilson",
        email: "david@inactive.com",
        role: "member",
        organization_id: orgMapping["UNDP"],
      },
    ];
    
    // Migrate users
    console.log('👥 Migrating users...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .insert(mockUsers)
      .select();
    
    if (userError) {
      console.error('❌ Error migrating users:', userError);
      return;
    }
    console.log(`✅ Migrated ${users?.length || 0} users\n`);
  }
  
  // Display summary
  console.log('\n📊 Migration Summary:');
  console.log('====================');
  
  const { data: finalOrgs } = await supabase.from('organizations').select('*');
  const { data: finalUsers } = await supabase.from('users').select('*');
  
  console.log(`Total organizations: ${finalOrgs?.length || 0}`);
  console.log(`Total users: ${finalUsers?.length || 0}`);
  
  if (finalUsers && finalUsers.length > 0) {
    console.log('\n🔐 Test Login Credentials:');
    console.log('========================');
    console.log('Email: john@example.com (Super User)');
    console.log('Email: jane@worldbank.org (Admin)');
    console.log('Email: mike@undp.org (Member)');
    console.log('(No passwords - using email-only auth for now)');
    
    console.log('\n📋 User IDs (for testing):');
    finalUsers.forEach(user => {
      console.log(`${user.email}: ${user.id}`);
    });
  }
}

migrateData().catch(console.error); 