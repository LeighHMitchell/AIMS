// Quick API Debug - Find out exactly what's causing the 400 error
// Paste this in your browser console

console.log('🔍 API Debug - Finding the 400 error cause...');

// Intercept fetch requests to see exactly what's being sent
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const [url, options] = args;
  
  if (url.includes('/api/users') && options?.method === 'PUT') {
    console.log('🚀 Intercepted PUT request to /api/users');
    console.log('📤 URL:', url);
    console.log('📤 Options:', options);
    
    if (options.body) {
      try {
        const bodyData = JSON.parse(options.body);
        console.log('📤 Request body:', bodyData);
        console.log('📤 User ID in request:', bodyData.id);
        console.log('📤 User ID type:', typeof bodyData.id);
      } catch (e) {
        console.log('📤 Could not parse request body:', options.body);
      }
    }
  }
  
  const response = await originalFetch.apply(this, args);
  
  if (url.includes('/api/users') && options?.method === 'PUT') {
    console.log('📥 Response status:', response.status);
    console.log('📥 Response ok:', response.ok);
    
    // Clone the response to read it without consuming it
    const responseClone = response.clone();
    try {
      const responseText = await responseClone.text();
      console.log('📥 Response body:', responseText);
      
      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText);
          console.error('❌ API Error Details:', errorData);
        } catch (e) {
          console.error('❌ API Error (not JSON):', responseText);
        }
      }
    } catch (e) {
      console.log('📥 Could not read response body');
    }
  }
  
  return response;
};

console.log('✅ Fetch interceptor installed');
console.log('💡 Now try to save your profile - I\'ll show you exactly what\'s being sent and received');

// Also check current user data
console.log('\n👤 Current user data:');
const userElement = document.querySelector('[data-user]');
if (userElement) {
  console.log('Found user element:', userElement.dataset.user);
}

// Check localStorage and sessionStorage
['localStorage', 'sessionStorage'].forEach(storageType => {
  const storage = window[storageType];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && (key.includes('user') || key.includes('auth') || key.includes('supabase'))) {
      try {
        const value = JSON.parse(storage.getItem(key));
        console.log(`📦 ${storageType}.${key}:`, value);
      } catch (e) {
        console.log(`📦 ${storageType}.${key}:`, storage.getItem(key));
      }
    }
  }
});

// Function to manually test with a specific user ID
window.testWithUserId = function(userId) {
  console.log('🧪 Testing with user ID:', userId);
  
  const testData = {
    id: userId,
    first_name: 'Leigh',
    last_name: 'Mitchell',
    job_title: 'Test Update'
  };
  
  fetch('/api/users', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testData),
  }).then(response => {
    console.log('Manual test response:', response.status);
    return response.text();
  }).then(text => {
    console.log('Manual test response body:', text);
  }).catch(error => {
    console.error('Manual test error:', error);
  });
};

console.log('\n💡 If you know your user ID, you can test directly with:');
console.log('testWithUserId("your-user-id-here")');
