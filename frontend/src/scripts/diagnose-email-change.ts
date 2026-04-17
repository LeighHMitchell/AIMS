import { getSupabaseAdmin } from '@/lib/supabase';

async function diagnoseEmailChange() {
  
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Supabase admin client is not configured');
    console.error('Check that SUPABASE_SERVICE_ROLE_KEY is set in .env.local');
    return;
  }


  // Test 1: Check if we can access auth admin functions
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 5
    });

    if (error) {
      console.error('❌ Cannot access auth admin functions:', error.message);
      console.error('Make sure SUPABASE_SERVICE_ROLE_KEY has admin privileges');
      return;
    }

    
    // List some user IDs for testing
    if (users && users.length > 0) {
      users.slice(0, 3).forEach((user: any) => {
      });
    }
  } catch (error) {
    console.error('❌ Unexpected error accessing auth:', error);
    return;
  }

  // Test 2: Check a specific user (if provided)
  const testUserId = process.argv[2];
  if (testUserId) {
    
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
      }

      // Test email update (dry run)
      if (authUser?.user) {
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
          }
        } catch (error) {
          console.error('❌ Unexpected error testing email update:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error checking user:', error);
    }
  }

}

diagnoseEmailChange().catch(console.error);
