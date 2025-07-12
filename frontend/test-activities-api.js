const fetch = require('node-fetch');

async function testActivitiesAPI() {
  try {
    console.log('Testing activities API...');
    const response = await fetch('http://localhost:3000/api/activities-optimized?limit=2');
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data keys:', Object.keys(data));
    console.log('Data structure:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.data && Array.isArray(data.data)) {
      console.log('✅ Found activities array with', data.data.length, 'items');
      if (data.data[0]) {
        console.log('✅ First activity:', {
          id: data.data[0].id,
          title: data.data[0].title,
          hasCommitments: !!data.data[0].commitments,
          hasDisbursements: !!data.data[0].disbursements
        });
      }
    } else {
      console.log('❌ No activities data found');
    }
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testActivitiesAPI();