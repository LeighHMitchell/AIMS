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

async function testUserUpdate() {
  try {
    console.log('Testing user update functionality...\n')

    // 1. Check if users table has the required columns
    console.log('1. Checking users table structure...')
    
    // Try a simple select to see what columns exist
    const { data: sampleUser, error: sampleError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single()

    if (sampleError) {
      console.error('   Error fetching sample user:', sampleError.message)
    } else {
      console.log('   Available columns:', Object.keys(sampleUser || {}))
    }

    // 2. Try to fetch a user
    console.log('\n2. Fetching a test user...')
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .limit(1)

    if (fetchError) {
      console.error('   Error fetching users:', fetchError.message)
      return
    }

    if (!users || users.length === 0) {
      console.log('   No users found in the database')
      return
    }

    const testUser = users[0]
    console.log('   Found user:', {
      id: testUser.id,
      email: testUser.email,
      first_name: testUser.first_name,
      last_name: testUser.last_name
    })

    // 3. Try to update the user
    console.log('\n3. Testing update of first_name and last_name...')
    const testFirstName = 'Test_' + (testUser.first_name || 'FirstName')
    const testLastName = 'Test_' + (testUser.last_name || 'LastName')

    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({
        first_name: testFirstName,
        last_name: testLastName
      })
      .eq('id', testUser.id)
      .select()

    if (updateError) {
      console.error('   ❌ Error updating user:', updateError.message)
      console.error('   Error details:', updateError)
    } else {
      console.log('   ✅ Successfully updated user:', updateData)
    }

    // 4. Note: profiles table has been consolidated into users table
    console.log('\n4. Profile data is now stored in users table')
    console.log('   Checking for profile fields in users table...')
    
    const { data: userWithProfile, error: profileCheckError } = await supabase
      .from('users')
      .select('avatar_url, preferred_language, reporting_org_id')
      .eq('id', testUser.id)
      .single()

    if (profileCheckError) {
      console.error('   Error checking profile fields:', profileCheckError.message)
    } else if (userWithProfile) {
      console.log('   Profile fields found in users table:', {
        has_avatar: !!userWithProfile.avatar_url,
        has_language: !!userWithProfile.preferred_language,
        has_reporting_org: !!userWithProfile.reporting_org_id
      })
    }

    // 5. Revert the test changes
    if (!updateError) {
      console.log('\n5. Reverting test changes...')
      const { error: revertError } = await supabase
        .from('users')
        .update({
          first_name: testUser.first_name,
          last_name: testUser.last_name
        })
        .eq('id', testUser.id)

      if (revertError) {
        console.error('   Error reverting changes:', revertError.message)
      } else {
        console.log('   ✅ Successfully reverted changes')
      }
    }

  } catch (error: any) {
    console.error('Unexpected error:', error)
  }
}

// Run the test
testUserUpdate()
  .then(() => {
    console.log('\nTest completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Test failed:', error)
    process.exit(1)
  }) 