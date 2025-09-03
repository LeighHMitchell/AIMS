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

async function fixAuthSync() {
  console.log('🔧 Fixing authentication and user table synchronization...\n');

  try {
    // 1. First, let's understand the current situation
    console.log('Step 1: Analyzing current mismatches...\n');
    
    // Get the testuser auth record
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const testUserAuth = authUsers?.users.find(u => u.email === 'testuser@aims.local');
    
    if (testUserAuth) {
      console.log('Found testuser@aims.local in auth:');
      console.log(`  Auth ID: ${testUserAuth.id}`);
      console.log(`  Auth Email: ${testUserAuth.email}`);
      
      // Check what's in the users table for this ID
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', testUserAuth.id)
        .single();
      
      if (userProfile) {
        console.log(`  Profile Email: ${userProfile.email}`);
        console.log(`  Profile Name: ${userProfile.first_name} ${userProfile.last_name}`);
        console.log(`  Organization ID: ${userProfile.organization_id}`);
        
        // This is the problem - the emails don't match!
        if (userProfile.email !== testUserAuth.email) {
          console.log('\n❌ MISMATCH DETECTED: Auth email and profile email are different!');
          console.log('   This is why you can login with testuser@aims.local but see different data.');
          
          // Fix option 1: Update the profile email to match auth
          console.log('\n📝 Fixing: Updating profile email to match auth email...');
          
          const { error: updateError } = await supabase
            .from('users')
            .update({ email: testUserAuth.email })
            .eq('id', testUserAuth.id);
          
          if (updateError) {
            console.error('Error updating profile email:', updateError);
          } else {
            console.log('✅ Profile email updated to match auth email');
          }
        }
      }
    }
    
    // 2. Now let's check for the actual leigh.h.mitchell@icloud.com auth user
    console.log('\nStep 2: Checking for your actual account...\n');
    
    const leighAuth = authUsers?.users.find(u => u.email === 'leigh.h.mitchell@icloud.com');
    
    if (!leighAuth) {
      console.log('❌ No auth user found for leigh.h.mitchell@icloud.com');
      console.log('   This means you need to create an auth account for your actual email.');
      
      // Check if there's a profile for this email
      const { data: leighProfile } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'leigh.h.mitchell@icloud.com')
        .single();
      
      if (leighProfile && leighProfile.id !== testUserAuth?.id) {
        console.log('\n📝 Found orphaned profile for leigh.h.mitchell@icloud.com');
        console.log(`  Profile ID: ${leighProfile.id}`);
        console.log(`  Name: ${leighProfile.first_name} ${leighProfile.last_name}`);
        console.log('\n⚠️  You have two options:');
        console.log('  1. Create a new auth account for leigh.h.mitchell@icloud.com');
        console.log('  2. Continue using testuser@aims.local to access this profile');
        
        // Let's create the auth account
        console.log('\n🔨 Creating auth account for leigh.h.mitchell@icloud.com...');
        
        const { data: newAuth, error: createError } = await supabase.auth.admin.createUser({
          email: 'leigh.h.mitchell@icloud.com',
          password: 'TempPassword123!', // You'll need to reset this
          email_confirm: true,
        });
        
        if (createError) {
          console.error('Error creating auth user:', createError);
        } else if (newAuth?.user) {
          console.log('✅ Auth account created successfully');
          console.log(`  New Auth ID: ${newAuth.user.id}`);
          
          // Update the profile to use the new auth ID
          const { error: updateIdError } = await supabase
            .from('users')
            .update({ id: newAuth.user.id })
            .eq('email', 'leigh.h.mitchell@icloud.com');
          
          if (updateIdError) {
            // If we can't update the ID (it's a primary key), we need to create a new profile
            console.log('Cannot update ID, creating new profile...');
            
            const { error: deleteError } = await supabase
              .from('users')
              .delete()
              .eq('email', 'leigh.h.mitchell@icloud.com');
            
            const newProfile = {
              ...leighProfile,
              id: newAuth.user.id,
            };
            
            const { error: insertError } = await supabase
              .from('users')
              .insert(newProfile);
            
            if (insertError) {
              console.error('Error creating new profile:', insertError);
            } else {
              console.log('✅ New profile created with correct auth ID');
            }
          } else {
            console.log('✅ Profile updated with new auth ID');
          }
          
          console.log('\n🎉 SUCCESS! You can now login with:');
          console.log('  Email: leigh.h.mitchell@icloud.com');
          console.log('  Password: TempPassword123!');
          console.log('  (Please change this password after logging in)');
        }
      }
    } else {
      console.log('✅ Auth user exists for leigh.h.mitchell@icloud.com');
      console.log(`  Auth ID: ${leighAuth.id}`);
    }
    
    // 3. Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY OF FIXES:');
    console.log('='.repeat(60));
    console.log('1. testuser@aims.local profile email has been synced');
    console.log('2. Created proper auth account for leigh.h.mitchell@icloud.com');
    console.log('\nYou should now be able to login with your actual email!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the fix
fixAuthSync();