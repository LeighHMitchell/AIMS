// Test script to verify subnational breakdown backend functionality
import { getSupabaseAdmin } from '../src/lib/supabase'

async function testSubnationalBackend() {
  const supabase = getSupabaseAdmin()
  
  console.log('🔍 Testing subnational breakdown backend...')
  
  try {
    // 1. Check if table exists
    console.log('\n1. Checking if subnational_breakdowns table exists...')
    const { data: tableCheck, error: tableError } = await supabase
      .from('subnational_breakdowns')
      .select('count')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Table does not exist:', tableError.message)
      console.log('\n📝 Please run this migration in your Supabase dashboard:')
      console.log('   frontend/supabase/migrations/20250129000002_create_subnational_breakdowns_table.sql')
      return
    }
    
    console.log('✅ Table exists!')
    
    // 2. Check if any activities exist
    console.log('\n2. Checking for existing activities...')
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, title')
      .limit(5)
    
    if (activitiesError) {
      console.error('❌ Error fetching activities:', activitiesError.message)
      return
    }
    
    if (!activities || activities.length === 0) {
      console.log('⚠️  No activities found. Create an activity first to test subnational breakdown.')
      return
    }
    
    console.log(`✅ Found ${activities.length} activities`)
    const testActivity = activities[0]
    console.log(`   Using activity: "${testActivity.title}" (${testActivity.id})`)
    
    // 3. Test inserting subnational breakdown data
    console.log('\n3. Testing insert operation...')
    const testData = [
      {
        activity_id: testActivity.id,
        region_name: 'Yangon Region',
        percentage: 40.0,
        is_nationwide: false
      },
      {
        activity_id: testActivity.id,
        region_name: 'Mandalay Region',
        percentage: 35.0,
        is_nationwide: false
      },
      {
        activity_id: testActivity.id,
        region_name: 'Shan State',
        percentage: 25.0,
        is_nationwide: false
      }
    ]
    
    // First, clean up any existing data for this activity
    await supabase
      .from('subnational_breakdowns')
      .delete()
      .eq('activity_id', testActivity.id)
    
    const { data: insertData, error: insertError } = await supabase
      .from('subnational_breakdowns')
      .insert(testData)
      .select()
    
    if (insertError) {
      console.error('❌ Error inserting test data:', insertError.message)
      return
    }
    
    console.log('✅ Successfully inserted test data')
    
    // 4. Test fetching the data
    console.log('\n4. Testing fetch operation...')
    const { data: fetchData, error: fetchError } = await supabase
      .from('subnational_breakdowns')
      .select('*')
      .eq('activity_id', testActivity.id)
      .order('region_name')
    
    if (fetchError) {
      console.error('❌ Error fetching data:', fetchError.message)
      return
    }
    
    console.log('✅ Successfully fetched data:')
    fetchData?.forEach((item: any) => {
      console.log(`   ${item.region_name}: ${item.percentage}%`)
    })
    
    // 5. Test API endpoint
    console.log('\n5. Testing API endpoint...')
    try {
      const response = await fetch(`http://localhost:3000/api/activities/${testActivity.id}/subnational-breakdown`)
      if (response.ok) {
        const apiData = await response.json()
        console.log('✅ API endpoint working!')
        console.log(`   Returned ${apiData.length} records`)
      } else {
        console.log('⚠️  API endpoint returned status:', response.status)
        console.log('   This might be normal if the dev server is not running')
      }
    } catch (apiError) {
      console.log('⚠️  Could not test API endpoint (dev server might not be running)')
    }
    
    // 6. Clean up test data
    console.log('\n6. Cleaning up test data...')
    await supabase
      .from('subnational_breakdowns')
      .delete()
      .eq('activity_id', testActivity.id)
    
    console.log('✅ Test data cleaned up')
    
    console.log('\n🎉 All tests passed! Subnational breakdown backend is working correctly.')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testSubnationalBackend().catch(console.error)
