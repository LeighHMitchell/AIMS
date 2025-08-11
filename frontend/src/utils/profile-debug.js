// Profile Update Debug Tool
// Copy and paste this entire script into your browser console to debug the profile update issue

console.log('🔧 Profile Update Debug Tool loaded');

// Function to check current user data
function checkCurrentUser() {
  console.log('👤 Checking current user data...');
  
  // Check if user is in localStorage
  const localUser = localStorage.getItem('user');
  if (localUser) {
    try {
      const user = JSON.parse(localUser);
      console.log('📦 User from localStorage:', user);
      return user;
    } catch (e) {
      console.error('❌ Error parsing user from localStorage:', e);
    }
  }
  
  // Check if user is in sessionStorage
  const sessionUser = sessionStorage.getItem('user');
  if (sessionUser) {
    try {
      const user = JSON.parse(sessionUser);
      console.log('📦 User from sessionStorage:', user);
      return user;
    } catch (e) {
      console.error('❌ Error parsing user from sessionStorage:', e);
    }
  }
  
  console.log('⚠️ No user found in storage');
  return null;
}

// Function to test the profile update API
async function testProfileUpdate() {
  console.log('🧪 Testing profile update API...');
  
  const user = checkCurrentUser();
  if (!user || !user.id) {
    console.error('❌ No user ID found. Cannot test API.');
    console.log('💡 Try logging in again or check if user is properly authenticated.');
    return;
  }
  
  const testData = {
    id: user.id,
    first_name: 'Leigh',
    last_name: 'Mitchell',
    job_title: 'Test Job Title Update',
    department: 'Test Department',
    telephone: '123-456-7890'
  };
  
  console.log('📤 Sending PUT request to /api/users');
  console.log('📤 Request data:', testData);
  
  try {
    const response = await fetch('/api/users', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response ok:', response.ok);
    
    // Get response text first
    const responseText = await response.text();
    console.log('📥 Raw response text:', responseText);
    
    if (!response.ok) {
      console.error(`❌ API request failed with status ${response.status}`);
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
      console.log('✅ API call successful!');
      console.log('✅ Response data:', data);
    } catch (e) {
      console.log('✅ API call successful but response is not JSON:', responseText);
    }
    
  } catch (error) {
    console.error('💥 Network error or exception:', error);
    console.error('💥 Error details:', error.message);
  }
}

// Function to check network tab for errors
function checkNetworkErrors() {
  console.log('🌐 To check for network errors:');
  console.log('1. Open Developer Tools (F12)');
  console.log('2. Go to the Network tab');
  console.log('3. Try to save your profile');
  console.log('4. Look for any failed requests (they will be red)');
  console.log('5. Click on the failed request to see error details');
}

// Function to monitor profile form submission
function monitorProfileForm() {
  console.log('👀 Setting up profile form monitoring...');
  
  // Look for the save button
  const saveButton = document.querySelector('button[type="submit"]') || 
                    document.querySelector('button:contains("Save")') ||
                    document.querySelector('[data-testid="save-button"]');
  
  if (saveButton) {
    console.log('🔘 Found save button:', saveButton);
    
    saveButton.addEventListener('click', function(e) {
      console.log('🔘 Save button clicked!');
      console.log('📝 Current form data:');
      
      // Try to capture form data
      const form = saveButton.closest('form') || document.querySelector('form');
      if (form) {
        const formData = new FormData(form);
        for (let [key, value] of formData.entries()) {
          console.log(`📝 ${key}: ${value}`);
        }
      }
    });
  } else {
    console.log('⚠️ Could not find save button to monitor');
  }
}

// Main debug function
function debugProfile() {
  console.log('🚀 Starting comprehensive profile debug...');
  console.log('=====================================');
  
  checkCurrentUser();
  console.log('');
  
  testProfileUpdate();
  console.log('');
  
  checkNetworkErrors();
  console.log('');
  
  monitorProfileForm();
  console.log('');
  
  console.log('🏁 Debug setup complete!');
  console.log('Now try to save your profile and check the console output.');
}

// Auto-run the debug
debugProfile();

// Make functions available globally for manual testing
window.debugProfile = debugProfile;
window.testProfileUpdate = testProfileUpdate;
window.checkCurrentUser = checkCurrentUser;

console.log('💡 You can also run these functions manually:');
console.log('- debugProfile() - Run full debug');
console.log('- testProfileUpdate() - Test API call only');
console.log('- checkCurrentUser() - Check user data only');
