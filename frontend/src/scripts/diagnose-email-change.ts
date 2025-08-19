import { getSupabaseAdmin } from '@/lib/supabase';

async function diagnoseEmailChange() {
  console.log('=== Email Change Diagnostics ===');
  
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Supabase admin client is not configured');
    console.error('Check that SUPABASE_SERVICE_ROLE_KEY is set in .env.local');
    return;
  }

  console.log('✅ Supabase admin client is configured');

  // Test 1: Check if we can access auth admin functions
  try {
    console.log('\n📋 Test 1: Checking auth admin access...');
    const { data: users, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 5
    });

    if (error) {
      console.error('❌ Cannot access auth admin functions:', error.message);
      console.error('Make sure SUPABASE_SERVICE_ROLE_KEY has admin privileges');
      return;
    }

    console.log(`✅ Auth admin access working. Found ${users?.length || 0} users`);
    
    // List some user IDs for testing
    if (users && users.length > 0) {
      console.log('\nSample user IDs for testing:');
      users.slice(0, 3).forEach((user: any) => {
        console.log(`- ${user.id} (${user.email})`);
      });
    }
  } catch (error) {
    console.error('❌ Unexpected error accessing auth:', error);
    return;
  }

  // Test 2: Check a specific user (if provided)
  const testUserId = process.argv[2];
  if (testUserId) {
    console.log(`\n📋 Test 2: Checking specific user ${testUserId}...`);
    
    try {
      // Check in auth
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(testUserId);
      
      if (authError) {
        console.error('❌ User not found in Auth:', authError.message);
      } else {
        console.log('✅ User found in Auth:', {
          id: authUser.user.id,
          email: authUser.user.email,
          created: authUser.user.created_at
        });
      }

      // Check in database
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role')
        .eq('id', testUserId)
        .single();

      if (dbError) {
        console.error('❌ User not found in database:', dbError.message);
      } else {
        console.log('✅ User found in database:', dbUser);
      }

      // Test email update (dry run)
      if (authUser?.user) {
        console.log('\n📋 Test 3: Testing email update capability...');
        const testEmail = `test-${Date.now()}@example.com`;
        
        try {
          // Don't actually update, just check if the API is accessible
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            testUserId,
            { email: authUser.user.email } // Use same email to avoid actual change
          );

          if (updateError) {
            console.error('❌ Email update API error:', {
              message: updateError.message,
              status: updateError.status,
              code: updateError.code
            });
            
            if (updateError.message?.includes('not enabled')) {
              console.error('\n⚠️  Email changes might be disabled in Supabase dashboard');
              console.error('Go to: Authentication > Settings > Enable email confirmations');
            }
          } else {
            console.log('✅ Email update API is accessible');
          }
        } catch (error) {
          console.error('❌ Unexpected error testing email update:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error checking user:', error);
    }
  }

  console.log('\n=== Diagnostics Complete ===');
  console.log('\nTo test a specific user, run:');
  console.log('npm run diagnose-email -- USER_ID');
}

diagnoseEmailChange().catch(console.error);
