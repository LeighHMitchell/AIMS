/**
 * Autosave Test Utilities
 * Quick tests to diagnose autosave issues
 */

export async function testAutosaveAPI() {
  console.log('🧪 Testing autosave API connectivity...');
  
  const testPayload = {
    title: 'Autosave Test ' + new Date().toISOString(),
    description: 'This is a test activity to verify autosave functionality',
    created_by_org_name: 'Test Organization',
    activity_status: 'planning',
    collaboration_type: 'bilateral',
    default_currency: 'USD',
    sectors: [],
    transactions: [],
    extendingPartners: [],
    implementingPartners: [],
    governmentPartners: [],
    contacts: [],
    governmentInputs: [],
    contributors: [],
    sdgMappings: [],
    tags: [],
    workingGroups: [],
    policyMarkers: [],
    locations: {
      specificLocations: [],
      coverageAreas: []
    }
  };

  try {
    console.log('📤 Sending test payload:', testPayload);
    
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📥 Response status:', response.status, response.statusText);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API test failed:', errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      };
    }

    const responseData = await response.json();
    console.log('✅ API test successful:', responseData);
    
    return {
      success: true,
      data: responseData,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      }
    };

  } catch (error) {
    console.error('❌ API test error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      exception: error
    };
  }
}

export async function testAutosaveWithLargePayload() {
  console.log('🧪 Testing autosave with large payload...');
  
  // Create a large payload to test size limits
  const largeSectors = Array.from({ length: 50 }, (_, i) => ({
    code: `${i.toString().padStart(5, '0')}`,
    name: `Test Sector ${i} with a very long description that takes up space `.repeat(10),
    percentage: Math.floor(Math.random() * 100),
    categoryCode: i.toString().substring(0, 3),
    categoryName: `Category ${i}`,
    categoryPercentage: Math.floor(Math.random() * 100),
    type: 'secondary'
  }));

  const largeTransactions = Array.from({ length: 30 }, (_, i) => ({
    id: `test-tx-${i}`,
    transaction_type: 'commitment',
    transaction_date: new Date().toISOString().split('T')[0],
    value: Math.floor(Math.random() * 1000000),
    currency: 'USD',
    provider_org_name: `Provider Organization ${i}`,
    receiver_org_name: `Receiver Organization ${i}`,
    description: `Transaction ${i} description with details `.repeat(20),
    status: 'actual'
  }));

  const testPayload = {
    title: 'Large Payload Test ' + new Date().toISOString(),
    description: 'This is a test activity with a large payload to test size limits. '.repeat(100),
    created_by_org_name: 'Test Organization',
    activity_status: 'planning',
    collaboration_type: 'bilateral',
    default_currency: 'USD',
    sectors: largeSectors,
    transactions: largeTransactions,
    extendingPartners: Array.from({ length: 20 }, (_, i) => ({
      orgId: `org-${i}`,
      name: `Extending Partner ${i}`
    })),
    implementingPartners: Array.from({ length: 20 }, (_, i) => ({
      orgId: `impl-org-${i}`,
      name: `Implementing Partner ${i}`
    })),
    governmentPartners: [],
    contacts: Array.from({ length: 15 }, (_, i) => ({
      id: `contact-${i}`,
      name: `Contact Person ${i}`,
      email: `contact${i}@example.com`,
      organization: `Contact Org ${i}`,
      role: 'Manager'
    })),
    governmentInputs: [],
    contributors: [],
    sdgMappings: [],
    tags: [],
    workingGroups: [],
    policyMarkers: [],
    locations: {
      specificLocations: [],
      coverageAreas: []
    }
  };

  const payloadString = JSON.stringify(testPayload);
  const payloadSizeKB = new TextEncoder().encode(payloadString).length / 1024;
  
  console.log(`📦 Large payload size: ${payloadSizeKB.toFixed(2)} KB`);

  return await testAutosaveAPI();
}

export function diagnoseCurrentActivity() {
  console.log('🔍 Diagnosing current activity state...');
  
  // Check if we're on an activity editor page
  const currentPath = window.location.pathname;
  if (!currentPath.includes('/activities')) {
    console.warn('⚠️ Not on an activity editor page');
    return { onActivityPage: false };
  }

  // Try to access autosave context from the window object
  const autosaveDebugger = (window as any).autosaveDebugger;
  if (!autosaveDebugger) {
    console.warn('⚠️ Autosave debugger not available');
    return { autosaveDebuggerAvailable: false };
  }

  // Check for activity data in various possible locations
  const possibleDataSources = [
    'activityData',
    'formData',
    'editorState'
  ];

  const foundData: any = {};
  possibleDataSources.forEach(source => {
    if ((window as any)[source]) {
      foundData[source] = (window as any)[source];
    }
  });

  console.log('📊 Found data sources:', Object.keys(foundData));

  // Check local storage for any relevant data
  const relevantLocalStorageKeys = Object.keys(localStorage).filter(key => 
    key.includes('activity') || key.includes('autosave') || key.includes('draft')
  );

  console.log('💾 Relevant localStorage keys:', relevantLocalStorageKeys);

  // Check for React DevTools if available
  const hasReactDevTools = !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  
  console.log('🔧 Environment check:', {
    onActivityPage: currentPath.includes('/activities'),
    autosaveDebuggerAvailable: !!autosaveDebugger,
    foundDataSources: Object.keys(foundData),
    relevantLocalStorageKeys,
    hasReactDevTools,
    isDevelopment: process.env.NODE_ENV === 'development'
  });

  return {
    onActivityPage: currentPath.includes('/activities'),
    autosaveDebuggerAvailable: !!autosaveDebugger,
    foundDataSources: Object.keys(foundData),
    relevantLocalStorageKeys,
    hasReactDevTools,
    environment: process.env.NODE_ENV
  };
}

// Make test functions available globally
if (typeof window !== 'undefined') {
  (window as any).testAutosaveAPI = testAutosaveAPI;
  (window as any).testAutosaveWithLargePayload = testAutosaveWithLargePayload;
  (window as any).diagnoseCurrentActivity = diagnoseCurrentActivity;
  
  console.log('🧪 Autosave test utilities loaded. Available commands:');
  console.log('  - window.testAutosaveAPI()');
  console.log('  - window.testAutosaveWithLargePayload()');
  console.log('  - window.diagnoseCurrentActivity()');
}