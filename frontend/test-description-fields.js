// Test script to verify description fields can save
const testDescriptionField = async () => {
  try {
    // Test with a sample activity ID - you can replace this with a real one
    const response = await fetch('http://localhost:3000/api/activities/field', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activityId: 'test-activity-id', // Replace with actual activity ID
        field: 'descriptionObjectives',
        value: 'Test objectives content'
      })
    });
    
    const data = await response.json();
    console.log('API Response:', data);
    
    if (response.ok) {
      console.log('✓ Description field save test successful');
    } else {
      console.log('✗ Description field save test failed:', data.error);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testDescriptionField();