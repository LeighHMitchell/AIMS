// =====================================================
// CONTACTS NOT SHOWING - FOCUSED DIAGNOSTIC
// =====================================================
// Purpose: Quickly identify why contacts in database don't appear in UI
// 
// INSTRUCTIONS:
// 1. Navigate to Activity Editor (the activity with missing contacts)
// 2. Open DevTools Console (F12)
// 3. Copy and paste this entire script
// 4. Press Enter
// 5. Review the output to see where the break is
// =====================================================

console.log('🔍 ========================================');
console.log('🔍 CONTACTS NOT SHOWING - DIAGNOSTIC');
console.log('🔍 ========================================');

async function diagnoseContactsNotShowing() {
  try {
    // Get activity ID from URL
    const urlMatch = window.location.pathname.match(/\/activities\/([a-f0-9-]+)/);
    if (!urlMatch) {
      console.error('❌ Could not find activity ID in URL');
      console.log('💡 Make sure you are on an Activity Editor page');
      console.log('💡 URL should look like: /activities/[UUID]/edit or /activities/new?id=[UUID]');
      return;
    }
    
    const activityId = urlMatch[1];
    console.log('✅ Activity ID:', activityId);
    console.log('');
    
    // ===== TEST 1: Check API Endpoint =====
    console.log('📡 TEST 1: Checking API endpoint...');
    console.log('📡 Fetching: /api/activities/' + activityId + '/contacts');
    
    const timestamp = Date.now();
    const response = await fetch(`/api/activities/${activityId}/contacts?_t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    console.log('📡 Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error('❌ API RETURNED ERROR!');
      console.error('❌ Status:', response.status);
      const errorText = await response.text();
      console.error('❌ Error:', errorText);
      console.log('');
      console.log('🔧 DIAGNOSIS: API endpoint is failing');
      console.log('🔧 Possible causes:');
      console.log('   - RLS policy blocking access');
      console.log('   - API route not working');
      console.log('   - Database connection issue');
      return;
    }
    
    const data = await response.json();
    console.log('✅ API Response OK');
    console.log('📊 Contacts returned by API:', data?.length || 0);
    
    if (!data || data.length === 0) {
      console.warn('⚠️ API RETURNED ZERO CONTACTS!');
      console.log('');
      console.log('🔧 DIAGNOSIS: Break is between Database → API');
      console.log('🔧 Possible causes:');
      console.log('   1. No contacts in database for this activity');
      console.log('   2. RLS policy blocking reads');
      console.log('   3. API transformation filtering them out');
      console.log('');
      console.log('🔍 Next steps:');
      console.log('   1. Check Supabase database directly');
      console.log('   2. Run this query:');
      console.log(`      SELECT * FROM activity_contacts WHERE activity_id = '${activityId}';`);
      console.log('   3. Check if rows are returned');
      return;
    }
    
    console.log('✅ API returned contacts!');
    console.log('📋 Contact data:', data);
    console.log('');
    
    // ===== TEST 2: Check UI State =====
    console.log('🎨 TEST 2: Checking UI component state...');
    
    // Check if we're on the contacts tab
    const contactsTabContent = document.body.textContent;
    const isOnContactsTab = contactsTabContent.includes('Current Activity Contacts') || 
                           contactsTabContent.includes('Add Contact to Activity');
    
    if (!isOnContactsTab) {
      console.warn('⚠️ You might not be on the Contacts tab');
      console.log('💡 Click the "Contacts" tab in the Activity Editor');
      console.log('💡 Then run this diagnostic again');
      console.log('');
    }
    
    // Check for contact cards in DOM
    const possibleCardSelectors = [
      '[class*="space-y-4"] > div',
      '[class*="border"][class*="rounded"]',
      'div[class*="p-"]'
    ];
    
    let contactCardsFound = 0;
    for (const selector of possibleCardSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent || '';
        if (text.includes('@') || text.includes('Email')) {
          contactCardsFound++;
        }
      }
    }
    
    console.log('🎨 Contact cards visible in DOM:', contactCardsFound);
    
    if (contactCardsFound === 0) {
      console.error('❌ UI IS NOT RENDERING CONTACTS!');
      console.log('');
      console.log('🔧 DIAGNOSIS: Break is between API → UI');
      console.log('🔧 API returns data but UI doesn\'t show it');
      console.log('');
      console.log('🔍 Possible causes:');
      console.log('   1. React state not updating after fetch');
      console.log('   2. ContactsTab component not mounting');
      console.log('   3. Conditional rendering hiding contacts');
      console.log('   4. CSS hiding the contact cards');
      console.log('   5. Using legacy ContactsSection instead of ContactsTab');
      console.log('');
      console.log('🔍 Check React DevTools:');
      console.log('   1. Open React DevTools');
      console.log('   2. Find "ContactsTab" component');
      console.log('   3. Check "contacts" state array');
      console.log('   4. Does it have the contacts?');
      return;
    }
    
    console.log('✅ Contact cards are being rendered!');
    console.log('');
    
    // ===== TEST 3: Compare Counts =====
    console.log('🔢 TEST 3: Comparing counts...');
    console.log('🔢 API returned:', data.length, 'contacts');
    console.log('🔢 UI showing:', contactCardsFound, 'contact cards (approximate)');
    
    if (data.length > contactCardsFound) {
      console.warn('⚠️ MISMATCH: API has more contacts than UI shows!');
      console.log('');
      console.log('🔧 DIAGNOSIS: Some contacts are not rendering');
      console.log('🔧 Possible causes:');
      console.log('   1. Duplicate React keys (same ID)');
      console.log('   2. Conditional rendering filtering some out');
      console.log('   3. Some cards hidden via CSS');
      console.log('');
      
      // Check for duplicate IDs
      const ids = data.map(c => c.id).filter(Boolean);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.error('❌ DUPLICATE IDs FOUND!');
        console.error('❌ This causes React to skip rendering duplicates');
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        console.error('❌ Duplicate IDs:', duplicates);
      }
    }
    
    // ===== SUMMARY =====
    console.log('');
    console.log('📝 ========================================');
    console.log('📝 DIAGNOSTIC SUMMARY');
    console.log('📝 ========================================');
    console.log('📝 Activity ID:', activityId);
    console.log('📝 API Status:', response.ok ? '✅ OK' : '❌ ERROR');
    console.log('📝 Contacts from API:', data.length);
    console.log('📝 Contact cards in UI:', contactCardsFound);
    console.log('📝');
    
    if (data.length === 0) {
      console.log('📝 DIAGNOSIS: 🔴 No contacts returned by API');
      console.log('📝 LIKELY CAUSE: RLS policy or no data in database');
      console.log('📝 ACTION: Check database directly');
    } else if (contactCardsFound === 0) {
      console.log('📝 DIAGNOSIS: 🔴 API works but UI not rendering');
      console.log('📝 LIKELY CAUSE: React state or component issue');
      console.log('📝 ACTION: Check React DevTools and component code');
    } else if (data.length > contactCardsFound) {
      console.log('📝 DIAGNOSIS: 🟡 Some contacts not rendering');
      console.log('📝 LIKELY CAUSE: Duplicate keys or conditional rendering');
      console.log('📝 ACTION: Check for duplicate IDs or hidden contacts');
    } else {
      console.log('📝 DIAGNOSIS: ✅ Everything looks OK!');
      console.log('📝 Contacts are being fetched and rendered');
      console.log('📝 If you still don\'t see them, check:');
      console.log('📝   - Are you on the Contacts tab?');
      console.log('📝   - Is the tab scrolled down?');
      console.log('📝   - Are they in a collapsed section?');
    }
    
    console.log('');
    console.log('📋 Full API Response:');
    console.table(data);
    
  } catch (error) {
    console.error('');
    console.error('❌ ========================================');
    console.error('❌ DIAGNOSTIC FAILED');
    console.error('❌ ========================================');
    console.error('❌ Error:', error);
    console.error('❌ Message:', error.message);
    console.error('❌ Stack:', error.stack);
  }
}

// Run the diagnostic
diagnoseContactsNotShowing();

console.log('');
console.log('💡 To run again: diagnoseContactsNotShowing()');

