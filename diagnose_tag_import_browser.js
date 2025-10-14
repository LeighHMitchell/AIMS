// ========================================
// IATI Tag Import Browser Diagnostic Script
// Run this in your browser console (F12)
// ========================================

async function diagnoseTags(activityId) {
  console.log('========================================');
  console.log('🔍 TAG IMPORT DIAGNOSTIC STARTING');
  console.log('Activity ID:', activityId);
  console.log('========================================\n');

  const results = {
    schemaCheck: null,
    getEndpoint: null,
    postEndpoint: null,
    databaseTags: null,
    issues: []
  };

  // === TEST 1: Check GET Endpoint ===
  console.log('📋 TEST 1: Check GET Endpoint');
  console.log('URL:', `/api/activities/${activityId}/tags`);
  try {
    const response = await fetch(`/api/activities/${activityId}/tags`);
    console.log('Status:', response.status, response.statusText);
    
    if (response.ok) {
      const tags = await response.json();
      console.log('✅ GET endpoint works');
      console.log('Tags returned:', tags);
      results.getEndpoint = { status: 'success', data: tags };
      
      if (tags.length === 0) {
        console.warn('⚠️  No tags returned - either none exist or not linked');
        results.issues.push('No tags returned from GET endpoint');
      }
    } else if (response.status === 405) {
      console.error('❌ GET endpoint not found (405 Method Not Allowed)');
      results.getEndpoint = { status: 'missing', error: '405 - Endpoint not deployed' };
      results.issues.push('GET endpoint returns 405 - needs deployment');
    } else {
      const errorData = await response.json();
      console.error('❌ GET endpoint failed:', errorData);
      results.getEndpoint = { status: 'error', error: errorData };
      results.issues.push(`GET endpoint error: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    results.getEndpoint = { status: 'network_error', error: error.message };
    results.issues.push('Network error fetching tags');
  }
  console.log('\n');

  // === TEST 2: Test POST Endpoint (Simple Tag) ===
  console.log('📋 TEST 2: Test POST Endpoint (Simple Tag)');
  try {
    const testPayload = {
      name: 'diagnostic-test-simple',
      vocabulary: '99',
      code: 'DIAG-SIMPLE-1'
    };
    console.log('Payload:', testPayload);
    
    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    
    console.log('Status:', response.status, response.statusText);
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('✅ POST endpoint works (simple tag)');
      console.log('Created tag:', responseData);
      results.postEndpoint = { status: 'success', data: responseData };
    } else {
      console.error('❌ POST endpoint failed (simple tag)');
      console.error('Error:', responseData);
      results.postEndpoint = { status: 'error', error: responseData };
      results.issues.push(`POST failed: ${responseData.error || responseData.details}`);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    results.postEndpoint = { status: 'network_error', error: error.message };
    results.issues.push('Network error creating tag');
  }
  console.log('\n');

  // === TEST 3: Test POST with Full IATI Fields ===
  console.log('📋 TEST 3: Test POST with Full IATI Fields');
  try {
    const testPayload = {
      name: 'diagnostic-test-full',
      vocabulary: '99',
      code: 'DIAG-FULL-1',
      vocabulary_uri: 'http://example.com/vocab.html'
    };
    console.log('Payload:', testPayload);
    
    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    
    console.log('Status:', response.status, response.statusText);
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('✅ POST endpoint works (full IATI fields)');
      console.log('Created tag:', responseData);
    } else {
      console.error('❌ POST endpoint failed (full IATI fields)');
      console.error('Error:', responseData);
      if (!results.postEndpoint || results.postEndpoint.status === 'success') {
        results.issues.push(`POST with vocabulary_uri failed: ${responseData.error || responseData.details}`);
      }
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
  console.log('\n');

  // === TEST 4: Test Tag Linking ===
  console.log('📋 TEST 4: Test Tag Linking');
  if (results.postEndpoint?.status === 'success') {
    try {
      const tagId = results.postEndpoint.data.id;
      console.log('Linking tag:', tagId, 'to activity:', activityId);
      
      const response = await fetch(`/api/activities/${activityId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId })
      });
      
      console.log('Status:', response.status, response.statusText);
      const responseData = await response.json();
      
      if (response.ok) {
        console.log('✅ Tag linking works');
        console.log('Link created:', responseData);
      } else {
        console.error('❌ Tag linking failed');
        console.error('Error:', responseData);
        results.issues.push(`Tag linking failed: ${responseData.error}`);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      results.issues.push('Network error linking tag');
    }
  } else {
    console.log('⏭️  Skipping (POST endpoint not working)');
  }
  console.log('\n');

  // === SUMMARY ===
  console.log('========================================');
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('========================================');
  console.log('GET Endpoint:', results.getEndpoint?.status || 'not tested');
  console.log('POST Endpoint:', results.postEndpoint?.status || 'not tested');
  console.log('\n');
  
  if (results.issues.length > 0) {
    console.log('🚨 ISSUES FOUND:', results.issues.length);
    results.issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  } else {
    console.log('✅ No issues found - endpoints working correctly');
  }
  
  console.log('\n');
  console.log('📋 NEXT STEPS:');
  
  if (results.issues.includes('GET endpoint returns 405 - needs deployment')) {
    console.log('  1. Redeploy your application to register the new GET endpoint');
    console.log('  2. Or check if changes were saved to the route file');
  }
  
  if (results.issues.some(i => i.includes('vocabulary_uri'))) {
    console.log('  1. Run the database migration:');
    console.log('     frontend/supabase/migrations/20250112000001_add_vocabulary_uri_to_tags.sql');
    console.log('  2. Check if vocabulary_uri column exists in tags table');
  }
  
  if (results.issues.some(i => i.includes('POST failed'))) {
    console.log('  1. Check server console logs for detailed error');
    console.log('  2. Run diagnose_tag_import_issue.sql in Supabase SQL Editor');
    console.log('  3. Verify database schema matches expected structure');
  }
  
  console.log('\n========================================');
  console.log('Full results object:');
  console.log(results);
  console.log('========================================');
  
  return results;
}

// === USAGE ===
console.log('To run diagnostic, execute:');
console.log('diagnoseTags("YOUR_ACTIVITY_ID")');
console.log('\nExample:');
console.log('diagnoseTags("123e4567-e89b-12d3-a456-426614174000")');

