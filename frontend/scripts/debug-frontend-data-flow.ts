import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugFrontendFlow() {
  console.log('🔍 Debugging frontend data flow...\n');
  
  // Test the exact same query the frontend makes
  console.log('1. Testing activities-simple endpoint format...');
  
  // This mimics what the legacy fetchActivities function does
  const timestamp = new Date().getTime();
  const limitParam = `limit=500`;
  const url = `/api/activities-simple?page=1&${limitParam}&t=${timestamp}`;
  
  console.log(`   Making request to: ${url}`);
  
  try {
    const response = await fetch(`http://localhost:3000${url}`);
    console.log(`   Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ Error response: ${errorText.substring(0, 300)}`);
      return;
    }
    
    const responseData = await response.json();
    console.log(`   ✅ Response received`);
    console.log(`   Response type: ${Array.isArray(responseData) ? 'Array' : 'Object'}`);
    
    if (responseData.data) {
      console.log(`   Has .data property with ${responseData.data.length} items`);
      const data = responseData.data;
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`   Sample activity:`, {
          id: data[0].id,
          title: data[0].title,
          partnerId: data[0].partnerId,
          activityStatus: data[0].activityStatus,
          commitments: data[0].commitments,
          disbursements: data[0].disbursements
        });
      }
    } else if (Array.isArray(responseData)) {
      console.log(`   Direct array with ${responseData.length} items`);
      if (responseData.length > 0) {
        console.log(`   Sample activity:`, {
          id: responseData[0].id,
          title: responseData[0].title,
          partnerId: responseData[0].partnerId
        });
      }
    } else {
      console.log(`   Unknown response format:`, Object.keys(responseData));
    }
    
  } catch (err) {
    console.log(`   ❌ Request failed:`, err);
  }

  // Test organizations endpoint
  console.log('\n2. Testing organizations endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/organizations');
    console.log(`   Response status: ${response.status}`);
    
    if (response.ok) {
      const orgs = await response.json();
      console.log(`   ✅ Got ${Array.isArray(orgs) ? orgs.length : 'non-array'} organizations`);
      if (Array.isArray(orgs) && orgs.length > 0) {
        console.log(`   Sample org:`, {
          id: orgs[0].id,
          name: orgs[0].name,
          acronym: orgs[0].acronym
        });
      }
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${errorText.substring(0, 200)}`);
    }
  } catch (err) {
    console.log(`   ❌ Request failed:`, err);
  }

  // Check what activities-simple actually returns
  console.log('\n3. Checking activities-simple direct database query...');
  try {
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        other_identifier,
        iati_identifier,
        description_narrative,
        activity_status,
        publication_status,
        submission_status,
        created_by_org_name,
        created_by_org_acronym,
        created_at,
        updated_at
      `)
      .limit(5);

    if (error) {
      console.log('   ❌ Database error:', error.message);
    } else {
      console.log(`   ✅ Database returned ${activities?.length || 0} activities`);
      if (activities && activities.length > 0) {
        console.log('   Sample from DB:', {
          id: activities[0].id,
          title_narrative: activities[0].title_narrative,
          other_identifier: activities[0].other_identifier,
          activity_status: activities[0].activity_status
        });
      }
    }
  } catch (err) {
    console.log('   ❌ Database query failed:', err);
  }
}

debugFrontendFlow();