import fetch from 'node-fetch';

async function testAPIEndpoints() {
  console.log('🔍 Testing API endpoints directly...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  // Test 1: Activities optimized endpoint
  console.log('1. Testing /api/activities-optimized...');
  try {
    const response = await fetch(`${baseUrl}/api/activities-optimized?page=1&limit=20`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success: ${data.data?.length || 0} activities returned`);
      console.log(`   Total count: ${data.pagination?.total || 'unknown'}`);
      if (data.data && data.data.length > 0) {
        console.log(`   Sample activity: ${data.data[0].title} (${data.data[0].id})`);
        console.log(`   Commitments: $${data.data[0].commitments || 0}`);
        console.log(`   Disbursements: $${data.data[0].disbursements || 0}`);
      }
    } else {
      console.log(`❌ Failed: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log(`   Error: ${text.substring(0, 200)}`);
    }
  } catch (err) {
    console.log('❌ Error:', err);
  }

  // Test 2: Organizations endpoint
  console.log('\n2. Testing /api/organizations...');
  try {
    const response = await fetch(`${baseUrl}/api/organizations`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success: ${Array.isArray(data) ? data.length : 'not array'} organizations returned`);
      if (Array.isArray(data) && data.length > 0) {
        console.log(`   Sample org: ${data[0].name} (${data[0].acronym || 'no acronym'})`);
      }
    } else {
      console.log(`❌ Failed: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log(`   Error: ${text.substring(0, 200)}`);
    }
  } catch (err) {
    console.log('❌ Error:', err);
  }

  // Test 3: Legacy activities endpoint
  console.log('\n3. Testing /api/activities-simple...');
  try {
    const response = await fetch(`${baseUrl}/api/activities-simple?limit=20`);
    if (response.ok) {
      const data = await response.json();
      const activities = data.data || data;
      console.log(`✅ Success: ${Array.isArray(activities) ? activities.length : 'not array'} activities returned`);
      if (Array.isArray(activities) && activities.length > 0) {
        console.log(`   Sample activity: ${activities[0].title} (${activities[0].id})`);
      }
    } else {
      console.log(`❌ Failed: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log(`   Error: ${text.substring(0, 200)}`);
    }
  } catch (err) {
    console.log('❌ Error:', err);
  }

  // Test 4: Check if server is actually running
  console.log('\n4. Testing server health...');
  try {
    const response = await fetch(`${baseUrl}/`);
    console.log(`✅ Server responding: ${response.status}`);
  } catch (err) {
    console.log('❌ Server not responding:', err);
  }
}

testAPIEndpoints();