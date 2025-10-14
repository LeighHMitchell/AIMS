// =====================================================
// CONTACTS API DIAGNOSTIC SCRIPT
// =====================================================
// Purpose: Test the contacts API endpoint and verify data transformation
// 
// INSTRUCTIONS:
// 1. Open browser DevTools Console (F12)
// 2. Navigate to Activity Editor with the problematic activity
// 3. Copy and paste this entire script into the console
// 4. Replace ACTIVITY_ID on line 12 with your actual activity UUID
// 5. Press Enter to run
// 6. Review the detailed output
// =====================================================

// CONFIGURE YOUR ACTIVITY ID HERE:
const ACTIVITY_ID = '<ACTIVITY_ID>'; // Replace with actual UUID

console.log('🔍 ========================================');
console.log('🔍 CONTACTS API DIAGNOSTIC TOOL');
console.log('🔍 ========================================');
console.log('🔍 Testing activity:', ACTIVITY_ID);
console.log('🔍');

async function diagnoseContactsAPI() {
  try {
    // ===== TEST 1: API Request =====
    console.log('📡 TEST 1: Fetching contacts from API...');
    const timestamp = Date.now();
    const url = `/api/activities/${ACTIVITY_ID}/contacts?_t=${timestamp}`;
    console.log('📡 URL:', url);
    
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    console.log('📡 Response status:', response.status, response.statusText);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('❌ API returned error status:', response.status);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    
    // ===== TEST 2: Data Structure =====
    console.log('');
    console.log('📊 TEST 2: Analyzing response data...');
    console.log('📊 Data type:', typeof data);
    console.log('📊 Is array:', Array.isArray(data));
    console.log('📊 Number of contacts:', data?.length || 0);
    
    if (!data || data.length === 0) {
      console.warn('⚠️ API returned no contacts!');
      console.log('⚠️ This means either:');
      console.log('   1. No contacts exist in database for this activity');
      console.log('   2. RLS policy is blocking access');
      console.log('   3. API is not querying correctly');
      return;
    }
    
    // ===== TEST 3: Detailed Contact Analysis =====
    console.log('');
    console.log('📋 TEST 3: Contact Details Analysis...');
    data.forEach((contact, index) => {
      console.log('');
      console.log(`📋 Contact ${index + 1} of ${data.length}:`);
      console.log(`   ID: ${contact.id || 'MISSING'}`);
      console.log(`   Name: ${contact.firstName || '?'} ${contact.middleName || ''} ${contact.lastName || '?'}`);
      console.log(`   Email: ${contact.email || 'Not provided'}`);
      console.log(`   Type: ${contact.type || 'Not set'}`);
      console.log(`   Position: ${contact.position || 'Not set'}`);
      console.log(`   Job Title: ${contact.jobTitle || 'Not set'}`);
      console.log(`   Organisation: ${contact.organisation || 'Not set'}`);
      console.log(`   Department: ${contact.department || 'Not set'}`);
      console.log(`   Phone: ${contact.phone || 'Not provided'}`);
      console.log(`   Website: ${contact.website || 'Not provided'}`);
      console.log(`   Mailing Address: ${contact.mailingAddress || 'Not provided'}`);
      console.log(`   Display on Web: ${contact.displayOnWeb !== undefined ? contact.displayOnWeb : 'undefined'}`);
      console.log(`   Is Focal Point: ${contact.isFocalPoint || false}`);
      console.log(`   Has Editing Rights: ${contact.hasEditingRights || false}`);
      console.log(`   Linked User ID: ${contact.linkedUserId || 'None'}`);
      console.log(`   Linked User Name: ${contact.linkedUserName || 'None'}`);
    });
    
    // ===== TEST 4: Check for Duplicate Keys =====
    console.log('');
    console.log('🔑 TEST 4: Checking for duplicate IDs (React key issue)...');
    const ids = data.map(c => c.id).filter(Boolean);
    const uniqueIds = new Set(ids);
    
    if (ids.length !== uniqueIds.size) {
      console.error('❌ DUPLICATE IDs FOUND!');
      console.error('❌ This will cause React to skip rendering duplicate contacts');
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      console.error('❌ Duplicate IDs:', duplicates);
    } else {
      console.log('✅ All contact IDs are unique');
    }
    
    // ===== TEST 5: Check for Empty/Invalid Data =====
    console.log('');
    console.log('🔍 TEST 5: Checking for invalid data...');
    data.forEach((contact, index) => {
      const issues = [];
      
      if (!contact.id) issues.push('Missing ID');
      if (!contact.firstName) issues.push('Missing firstName');
      if (!contact.lastName) issues.push('Missing lastName');
      if (!contact.type) issues.push('Missing type');
      
      if (issues.length > 0) {
        console.warn(`⚠️ Contact ${index + 1} has issues:`, issues);
      }
    });
    
    // ===== TEST 6: Deduplication Analysis =====
    console.log('');
    console.log('🔄 TEST 6: Deduplication analysis...');
    const dedupKeys = data.map(c => 
      `${(c.email || '').toLowerCase()}_${(c.firstName || '').toLowerCase()}_${(c.lastName || '').toLowerCase()}`
    );
    const uniqueDedupKeys = new Set(dedupKeys);
    
    if (dedupKeys.length !== uniqueDedupKeys.size) {
      console.warn('⚠️ DUPLICATE CONTACTS DETECTED (by email+name)!');
      console.warn('⚠️ These contacts would be merged if re-imported from XML');
      dedupKeys.forEach((key, index) => {
        if (dedupKeys.indexOf(key) !== index) {
          console.warn(`   - Contact ${index + 1}: "${data[index].firstName} ${data[index].lastName}" (${data[index].email})`);
        }
      });
    } else {
      console.log('✅ No duplicate contacts (by email+name combination)');
    }
    
    // ===== SUMMARY =====
    console.log('');
    console.log('📝 ========================================');
    console.log('📝 DIAGNOSTIC SUMMARY');
    console.log('📝 ========================================');
    console.log(`📝 API Status: ${response.ok ? '✅ OK' : '❌ ERROR'}`);
    console.log(`📝 Contacts Returned: ${data.length}`);
    console.log(`📝 Unique IDs: ${uniqueIds.size}`);
    console.log(`📝 Unique by Email+Name: ${uniqueDedupKeys.size}`);
    console.log('📝');
    console.log('📝 Full data object:');
    console.log(data);
    
  } catch (error) {
    console.error('');
    console.error('❌ ========================================');
    console.error('❌ DIAGNOSTIC FAILED WITH ERROR');
    console.error('❌ ========================================');
    console.error('❌ Error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
  }
}

// Run the diagnostic
diagnoseContactsAPI();

