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

async function consolidateUsers() {
  console.log('🔧 Consolidating Users: Ensuring every user can login\n');
  console.log('=' .repeat(60));
  console.log('UNDERSTANDING THE SYSTEM:');
  console.log('=' .repeat(60));
  console.log('• auth.users = Login credentials (managed by Supabase)');
  console.log('• public.users = User profiles (your app data)');
  console.log('• Both tables must be in sync with matching IDs\n');

  try {
    // Get all auth users
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authUsers = authData?.users || [];
    
    // Get all profiles
    const { data: profiles } = await supabase
      .from('users')
      .select('*')
      .order('email');
    
    console.log('=' .repeat(60));
    console.log('CURRENT STATE:');
    console.log('=' .repeat(60));
    console.log(`Auth accounts: ${authUsers.length}`);
    console.log(`User profiles: ${profiles?.length || 0}\n`);

    // 1. Find profiles without auth
    console.log('📋 Profiles that CANNOT login (no auth account):');
    console.log('-' .repeat(40));
    
    const profilesWithoutAuth: any[] = [];
    if (profiles) {
      for (const profile of profiles) {
        const hasAuth = authUsers.some(a => a.id === profile.id);
        if (!hasAuth) {
          profilesWithoutAuth.push(profile);
          console.log(`❌ ${profile.email} - ${profile.first_name} ${profile.last_name}`);
        }
      }
    }
    
    if (profilesWithoutAuth.length === 0) {
      console.log('✅ All profiles have auth accounts');
    }

    // 2. Find auth without profiles
    console.log('\n📋 Auth accounts without profiles (can login but no data):');
    console.log('-' .repeat(40));
    
    const authWithoutProfiles: any[] = [];
    for (const auth of authUsers) {
      const hasProfile = profiles?.some(p => p.id === auth.id);
      if (!hasProfile) {
        authWithoutProfiles.push(auth);
        console.log(`❌ ${auth.email}`);
      }
    }
    
    if (authWithoutProfiles.length === 0) {
      console.log('✅ All auth accounts have profiles');
    }

    // 3. Fix the issues
    if (profilesWithoutAuth.length > 0 || authWithoutProfiles.length > 0) {
      console.log('\n' + '=' .repeat(60));
      console.log('FIXING ISSUES:');
      console.log('=' .repeat(60));

      // Create auth accounts for profiles that need them
      if (profilesWithoutAuth.length > 0) {
        console.log('\n🔨 Creating auth accounts for profiles...');
        
        for (const profile of profilesWithoutAuth) {
          console.log(`\nProcessing: ${profile.email}`);
          
          // Check if there's an auth with this email but different ID
          const existingAuth = authUsers.find(a => a.email === profile.email);
          
          if (existingAuth) {
            console.log(`  Found existing auth with different ID`);
            console.log(`  Auth ID: ${existingAuth.id}`);
            console.log(`  Profile ID: ${profile.id}`);
            
            // Create a new profile with the correct ID
            const newProfile = { ...profile, id: existingAuth.id };
            delete newProfile.created_at; // Remove auto-generated fields
            delete newProfile.updated_at;
            
            // Delete old profile
            await supabase.from('users').delete().eq('id', profile.id);
            
            // Insert new profile with correct ID
            const { error } = await supabase.from('users').insert(newProfile);
            
            if (error) {
              console.log(`  ❌ Error: ${error.message}`);
            } else {
              console.log(`  ✅ Profile re-created with correct ID`);
            }
          } else {
            // Create new auth account
            const tempPassword = `TempPass${Date.now()}!`;
            const { data: newAuth, error } = await supabase.auth.admin.createUser({
              email: profile.email,
              password: tempPassword,
              email_confirm: true,
            });
            
            if (error) {
              console.log(`  ❌ Error creating auth: ${error.message}`);
            } else if (newAuth?.user) {
              // Update profile with new auth ID
              const newProfile = { ...profile, id: newAuth.user.id };
              delete newProfile.created_at;
              delete newProfile.updated_at;
              
              await supabase.from('users').delete().eq('id', profile.id);
              await supabase.from('users').insert(newProfile);
              
              console.log(`  ✅ Auth created with password: ${tempPassword}`);
            }
          }
        }
      }

      // Create profiles for auth accounts that need them
      if (authWithoutProfiles.length > 0) {
        console.log('\n🔨 Creating profiles for auth accounts...');
        
        for (const auth of authWithoutProfiles) {
          console.log(`\nProcessing: ${auth.email}`);
          
          // Check if there's a profile with this email but different ID
          const existingProfile = profiles?.find(p => p.email === auth.email);
          
          if (existingProfile) {
            console.log(`  Found existing profile with different ID`);
            console.log(`  Will link to existing profile data`);
            
            const newProfile = { ...existingProfile, id: auth.id };
            delete newProfile.created_at;
            delete newProfile.updated_at;
            
            await supabase.from('users').delete().eq('id', existingProfile.id);
            const { error } = await supabase.from('users').insert(newProfile);
            
            if (error) {
              console.log(`  ❌ Error: ${error.message}`);
            } else {
              console.log(`  ✅ Profile linked to auth account`);
            }
          } else {
            // Create minimal profile
            const nameParts = auth.email.split('@')[0].split('.');
            const firstName = nameParts[0] || '';
            const lastName = nameParts[1] || '';
            
            const { error } = await supabase.from('users').insert({
              id: auth.id,
              email: auth.email,
              first_name: firstName,
              last_name: lastName,
              role: 'dev_partner_tier_2',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            
            if (error) {
              console.log(`  ❌ Error creating profile: ${error.message}`);
            } else {
              console.log(`  ✅ Basic profile created`);
            }
          }
        }
      }
    }

    // 4. Final verification
    console.log('\n' + '=' .repeat(60));
    console.log('FINAL STATE:');
    console.log('=' .repeat(60));
    
    // Re-fetch to verify
    const { data: finalAuth } = await supabase.auth.admin.listUsers();
    const { data: finalProfiles } = await supabase.from('users').select('*');
    
    console.log(`✅ Total users who can login: ${finalAuth?.users.length || 0}`);
    console.log(`✅ Total user profiles: ${finalProfiles?.length || 0}`);
    
    if (finalAuth?.users.length === finalProfiles?.length) {
      console.log('\n🎉 SUCCESS: All users are properly synced!');
      console.log('Every user with a profile can now login.');
    } else {
      console.log('\n⚠️  There may still be sync issues. Run this script again.');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run consolidation
consolidateUsers();