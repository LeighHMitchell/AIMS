import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('Supabase initialized:', !!supabase)

async function testUserSettingsUpdate() {
  try {
    console.log('Testing user settings update...\n')

    // 1. Find a user to test with
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'john@example.com')
      .limit(1)

    if (fetchError) {
      console.error('Error fetching user:', fetchError)
      return
    }

    if (!users || users.length === 0) {
      console.log('No user found with email john@example.com')
      return
    }

    const testUser = users[0]
    console.log('Found user:', {
      id: testUser.id,
      email: testUser.email,
      first_name: testUser.first_name,
      last_name: testUser.last_name,
      role: testUser.role
    })

    // 2. Try to update the user's name and email
    console.log('\nTesting update of name and email...')
    const updateData = {
      first_name: 'Leigh',
      last_name: 'Mitchell',
      email: 'leigh@example.com'
    }

    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', testUser.id)
      .select()

    if (updateError) {
      console.error('❌ Error updating user:', updateError)
      console.error('Error details:', JSON.stringify(updateError, null, 2))
    } else {
      console.log('✅ Successfully updated user:', updateResult)
    }

    // 3. Check RLS policies
    console.log('\n3. Checking RLS policies...')
    const { data: policies, error: policyError } = await supabase
      .rpc('get_policies', { table_name: 'users' })
      .single()

    if (policyError) {
      // Try a simpler query
      const { data: userPolicies } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'users')
      
      if (userPolicies) {
        console.log('User table policies:', userPolicies)
      }
    }

    // 4. Try updating auth.users email
    console.log('\n4. Testing auth.users email update...')
    // Note: This requires the user to be authenticated, so we'll skip it in this test
    console.log('Skipping auth.users update (requires authentication)')

  } catch (error: any) {
    console.error('Unexpected error:', error)
  }
}

// Run the test
testUserSettingsUpdate()
  .then(() => {
    console.log('\nTest completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Test failed:', error)
    process.exit(1)
  }) 