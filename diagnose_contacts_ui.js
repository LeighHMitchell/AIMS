// =====================================================
// CONTACTS UI STATE DIAGNOSTIC SCRIPT
// =====================================================
// Purpose: Inspect React component state and rendering
// 
// INSTRUCTIONS:
// 1. Navigate to Activity Editor → Contacts tab
// 2. Open browser DevTools Console (F12)
// 3. Copy and paste this entire script into the console
// 4. Press Enter to run
// 5. Review the output
// 
// NOTE: This requires React DevTools browser extension for full analysis
// =====================================================

console.log('🎨 ========================================');
console.log('🎨 CONTACTS UI DIAGNOSTIC TOOL');
console.log('🎨 ========================================');

async function diagnoseContactsUI() {
  try {
    // ===== TEST 1: Check if ContactsTab is mounted =====
    console.log('');
    console.log('🔍 TEST 1: Locating ContactsTab component...');
    
    // Look for telltale elements
    const searchBar = document.querySelector('[placeholder*="Search"]');
    const contactCards = document.querySelectorAll('[class*="contact"]');
    const contactsList = document.querySelector('[class*="space-y-4"]');
    
    console.log('🔍 Search bar found:', !!searchBar);
    console.log('🔍 Contact cards found:', contactCards.length);
    console.log('🔍 Contacts list container found:', !!contactsList);
    
    // ===== TEST 2: Count visible contact cards =====
    console.log('');
    console.log('📊 TEST 2: Analyzing visible contact cards...');
    
    // Try to find contact cards by various selectors
    const possibleCardSelectors = [
      '[class*="ContactCard"]',
      '[class*="space-y-4"] > div',
      '[class*="border"][class*="rounded"]'
    ];
    
    let foundCards = [];
    for (const selector of possibleCardSelectors) {
      const cards = Array.from(document.querySelectorAll(selector));
      if (cards.length > 0) {
        console.log(`📊 Found ${cards.length} elements matching: ${selector}`);
        foundCards = cards;
      }
    }
    
    if (foundCards.length === 0) {
      console.warn('⚠️ Could not locate contact cards in DOM');
      console.log('⚠️ This could mean:');
      console.log('   1. No contacts to display');
      console.log('   2. Different component structure than expected');
      console.log('   3. Not on the Contacts tab');
    } else {
      console.log(`📊 Analyzing ${foundCards.length} potential contact cards...`);
      
      foundCards.forEach((card, index) => {
        const text = card.textContent || '';
        const isHidden = window.getComputedStyle(card).display === 'none';
        const isVisible = window.getComputedStyle(card).visibility === 'visible';
        const opacity = window.getComputedStyle(card).opacity;
        
        console.log(`   Card ${index + 1}:`);
        console.log(`     - Text length: ${text.length} chars`);
        console.log(`     - Display: ${window.getComputedStyle(card).display}`);
        console.log(`     - Visibility: ${window.getComputedStyle(card).visibility}`);
        console.log(`     - Opacity: ${opacity}`);
        console.log(`     - Is hidden: ${isHidden}`);
        
        if (text.includes('@')) {
          console.log(`     - Contains email: Yes`);
        }
      });
    }
    
    // ===== TEST 3: Check for count display =====
    console.log('');
    console.log('🔢 TEST 3: Looking for contact count display...');
    
    // Look for "Current Activity Contacts (X)" text
    const bodyText = document.body.textContent;
    const countMatch = bodyText.match(/Current Activity Contacts \((\d+)\)/);
    
    if (countMatch) {
      const displayedCount = parseInt(countMatch[1]);
      console.log(`🔢 UI shows: ${displayedCount} contact(s)`);
      
      if (displayedCount !== foundCards.length) {
        console.warn(`⚠️ MISMATCH: UI header says ${displayedCount} but found ${foundCards.length} cards`);
      }
    } else {
      console.log('🔢 Could not find contact count in UI');
    }
    
    // ===== TEST 4: Check console logs =====
    console.log('');
    console.log('📜 TEST 4: Checking for component logs...');
    console.log('📜 Look for these logs in the console (scroll up):');
    console.log('   - [ContactsTab] Fetching contacts for activity:');
    console.log('   - [ContactsTab] Fetched contacts: X contacts');
    console.log('   - [Contacts API] Returning X transformed contact(s)');
    console.log('');
    console.log('📜 If you don\'t see these, refresh the page and check again');
    
    // ===== TEST 5: Try to access React state via DevTools =====
    console.log('');
    console.log('⚛️ TEST 5: React DevTools check...');
    
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('⚛️ React DevTools is installed ✅');
      console.log('⚛️ Manual steps:');
      console.log('   1. Open React DevTools tab');
      console.log('   2. Click "Components" tab');
      console.log('   3. Search for "ContactsTab"');
      console.log('   4. Inspect the "contacts" state array');
      console.log('   5. Verify length matches database count');
    } else {
      console.warn('⚠️ React DevTools not detected');
      console.log('⚠️ Install React DevTools extension for full component inspection');
    }
    
    // ===== TEST 6: Check for JavaScript errors =====
    console.log('');
    console.log('🐛 TEST 6: Checking for JavaScript errors...');
    console.log('🐛 Review the Console tab for any errors (red text)');
    console.log('🐛 Common issues:');
    console.log('   - "Cannot read property of undefined"');
    console.log('   - "Each child should have unique key prop"');
    console.log('   - "Maximum update depth exceeded"');
    
    // ===== TEST 7: Network tab check =====
    console.log('');
    console.log('🌐 TEST 7: Network requests...');
    console.log('🌐 Manual steps:');
    console.log('   1. Open DevTools → Network tab');
    console.log('   2. Filter by "contacts"');
    console.log('   3. Refresh the Contacts tab');
    console.log('   4. Check the API response:');
    console.log('      - Status should be 200 OK');
    console.log('      - Response should contain array of contacts');
    console.log('      - Array length should match database count');
    
    // ===== SUMMARY =====
    console.log('');
    console.log('📝 ========================================');
    console.log('📝 UI DIAGNOSTIC SUMMARY');
    console.log('📝 ========================================');
    console.log(`📝 Contact cards in DOM: ${foundCards.length}`);
    console.log(`📝 React DevTools available: ${!!window.__REACT_DEVTOOLS_GLOBAL_HOOK__}`);
    console.log('📝');
    console.log('📝 NEXT STEPS:');
    if (foundCards.length < 2) {
      console.log('📝 1. Run diagnose_contacts_api.js to check API response');
      console.log('📝 2. Compare API response count with UI display');
      console.log('📝 3. If API returns 2 but UI shows 1, issue is in rendering');
      console.log('📝 4. Check for duplicate React keys or CSS hiding issues');
    } else {
      console.log('📝 ✅ UI is rendering the expected number of contact cards');
      console.log('📝 If you see 2 cards but think there should be more,');
      console.log('📝 check the database with diagnose_contacts_display.sql');
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ ========================================');
    console.error('❌ UI DIAGNOSTIC FAILED WITH ERROR');
    console.error('❌ ========================================');
    console.error('❌ Error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
  }
}

// Run the diagnostic
diagnoseContactsUI();

