import fetch from 'node-fetch';

async function testOrganizationsEndpoint() {
  console.log('🔍 Testing organizations endpoint...\n');
  
  try {
    const startTime = Date.now();
    console.log('Making request to /api/organizations...');
    
    const response = await fetch('http://localhost:3000/api/organizations', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'test-script'
      }
    });
    
    const endTime = Date.now();
    console.log(`Request completed in ${endTime - startTime}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success: ${Array.isArray(data) ? data.length : 'not array'} organizations`);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('Sample organization:', {
          id: data[0].id,
          name: data[0].name,
          acronym: data[0].acronym
        });
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Error response: ${errorText.substring(0, 300)}`);
    }
    
  } catch (err) {
    console.log('❌ Request failed:', err);
  }
}

testOrganizationsEndpoint();