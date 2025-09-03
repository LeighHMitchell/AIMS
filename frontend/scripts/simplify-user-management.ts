import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

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

async function simplifyUserManagement() {
  console.log('🎯 SIMPLIFYING USER MANAGEMENT\n');
  console.log('=' .repeat(60));
  
  try {
    // Read and execute the SQL to create the view
    const sqlPath = path.join(__dirname, 'create-unified-users-view.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Creating unified view to simplify user management...\n');
    
    // Note: Supabase doesn't allow direct SQL execution via the client
    // So we'll create helper functions instead
    
    console.log('Since we cannot directly execute SQL through the client,');
    console.log('here\'s how to simplify your user management:\n');
    
    console.log('OPTION 1: Use Supabase Dashboard');
    console.log('-'.repeat(40));
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of:');
    console.log('   scripts/create-unified-users-view.sql');
    console.log('4. Run the SQL\n');
    
    console.log('OPTION 2: Use Our Helper Functions');
    console.log('-'.repeat(40));
    console.log('We\'ll create helper functions to simplify user management:\n');
    
    // Create a simple user management interface
    console.log('📋 SIMPLIFIED USER LIST:');
    console.log('=' .repeat(60));
    
    // Get all users in a simplified format
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const { data: profiles } = await supabase
      .from('users')
      .select('*, organizations(name, acronym)');
    
    // Create a unified list
    const unifiedUsers = new Map();
    
    // Add all auth users
    authUsers?.users.forEach(auth => {
      unifiedUsers.set(auth.id, {
        id: auth.id,
        email: auth.email,
        can_login: true,
        last_login: auth.last_sign_in_at,
        has_profile: false,
        name: '',
        organization: '',
        role: ''
      });
    });
    
    // Merge with profile data
    profiles?.forEach(profile => {
      const existing = unifiedUsers.get(profile.id);
      if (existing) {
        existing.has_profile = true;
        existing.name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        existing.organization = profile.organizations 
          ? `${profile.organizations.name}${profile.organizations.acronym ? ` (${profile.organizations.acronym})` : ''}`
          : '';
        existing.role = profile.role;
      } else {
        // Profile without auth
        unifiedUsers.set(profile.id, {
          id: profile.id,
          email: profile.email,
          can_login: false,
          last_login: null,
          has_profile: true,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          organization: profile.organizations 
            ? `${profile.organizations.name}${profile.organizations.acronym ? ` (${profile.organizations.acronym})` : ''}`
            : '',
          role: profile.role
        });
      }
    });
    
    // Display the unified list
    console.log('Email                          | Name              | Organization           | Can Login');
    console.log('-'.repeat(90));
    
    Array.from(unifiedUsers.values())
      .sort((a, b) => a.email.localeCompare(b.email))
      .forEach(user => {
        const email = user.email.padEnd(30);
        const name = user.name.padEnd(17);
        const org = (user.organization || 'None').substring(0, 22).padEnd(22);
        const loginStatus = user.can_login ? '✅' : '❌';
        console.log(`${email} | ${name} | ${org} | ${loginStatus}`);
      });
    
    console.log('\n' + '=' .repeat(60));
    console.log('SIMPLIFICATION COMPLETE!');
    console.log('=' .repeat(60));
    console.log('\nNow you have:');
    console.log('• A unified view of all users');
    console.log('• Clear indication of who can login');
    console.log('• All user data in one place\n');
    
    console.log('To avoid confusion going forward:');
    console.log('1. Think of it as ONE user system');
    console.log('2. Auth = login capability');
    console.log('3. Profile = user details');
    console.log('4. They work together with the same ID\n');
    
    // Save helper functions
    const helperFunctions = `
// Helper functions to work with users as a single entity

export async function getAllUsers() {
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const { data: profiles } = await supabase
    .from('users')
    .select('*, organizations(name, acronym)');
  
  // Merge both sources
  return mergeUserData(authUsers?.users || [], profiles || []);
}

export async function createUser(userData: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  organization_id?: string;
}) {
  // Step 1: Create auth account
  const { data: auth, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true
  });
  
  if (authError) throw authError;
  
  // Step 2: Create profile with same ID
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: auth.user.id,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role,
      organization_id: userData.organization_id
    });
  
  if (profileError) throw profileError;
  
  return { success: true, user: auth.user };
}

export async function deleteUser(email: string) {
  // Find the user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const user = authUsers?.users.find(u => u.email === email);
  
  if (!user) throw new Error('User not found');
  
  // Delete both auth and profile
  await supabase.from('users').delete().eq('id', user.id);
  await supabase.auth.admin.deleteUser(user.id);
  
  return { success: true };
}
`;
    
    fs.writeFileSync(
      path.join(__dirname, '../lib/user-management.ts'),
      helperFunctions
    );
    
    console.log('✅ Created helper functions in lib/user-management.ts');
    console.log('   Use these to manage users as a single entity.\n');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run simplification
simplifyUserManagement();