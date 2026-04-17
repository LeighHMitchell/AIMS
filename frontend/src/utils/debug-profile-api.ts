// Debug script to test the profile update API directly
// You can run this in your browser console to see what's happening

export const debugProfileUpdate = async () => {
  
  // Test data - modify these values to test
  const testData = {
    id: 'your-user-id-here', // You'll need to replace this with your actual user ID
    first_name: 'Leigh',
    last_name: 'Mitchell', 
    job_title: 'Test Job Title',
    department: 'Test Department',
    telephone: '123-456-7890'
  };
  
  try {
    
    const response = await fetch('/api/users', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('❌ Request failed');
      try {
        const errorData = JSON.parse(responseText);
        console.error('❌ Error details:', errorData);
      } catch (e) {
        console.error('❌ Could not parse error response as JSON');
      }
      return;
    }
    
    try {
      const data = JSON.parse(responseText);
    } catch (e) {
    }
    
  } catch (error) {
    console.error('💥 Network or other error:', error);
  }
};

// Instructions to use this debug function:
console.log(`
🔧 To debug your profile update issue:

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Copy and paste this entire script
4. Find your user ID by running: 
   localStorage.getItem('user') // or check the user object in your app
5. Update the 'id' field in testData above with your actual user ID
6. Run: debugProfileUpdate()
7. Check the console output for detailed error information

This will show you exactly what's happening when the API call is made.
`);
