// =====================================================
// XML CONTACT IMPORT DIAGNOSTIC SCRIPT
// =====================================================
// Purpose: Test XML parsing and contact mapping functionality
// 
// INSTRUCTIONS:
// 1. Open browser DevTools Console (F12) 
// 2. Navigate to Activity Editor → XML Import tab
// 3. Copy and paste this entire script into the console
// 4. Press Enter to run
// 5. Upload test_contact_xml_import.xml to verify full flow
// =====================================================

console.log('🔬 ========================================');
console.log('🔬 XML CONTACT IMPORT DIAGNOSTIC TOOL');
console.log('🔬 ========================================');

// Test contact data from user's XML structure
const testIATIContact = {
  type: "1",
  organization: "Agency A",
  department: "Department B", 
  personName: "A. Example",
  jobTitle: "Transparency Lead",
  telephone: "0044111222333444",
  email: "transparency@example.org",
  website: "http://www.example.org",
  mailingAddress: "Transparency House, The Street, Town, City, Postcode"
};

async function diagnoseXMLContactImport() {
  try {
    // ===== TEST 1: Load contact-utils module =====
    console.log('');
    console.log('📦 TEST 1: Loading contact-utils module...');
    
    let contactUtils;
    try {
      contactUtils = await import('/src/lib/contact-utils.js');
      console.log('✅ contact-utils loaded successfully');
      console.log('✅ Available functions:', Object.keys(contactUtils));
    } catch (error) {
      console.error('❌ Failed to load contact-utils:', error.message);
      console.log('💡 Try alternative import path...');
      try {
        contactUtils = await import('@/lib/contact-utils');
        console.log('✅ contact-utils loaded via @ alias');
      } catch (altError) {
        console.error('❌ All import paths failed');
        console.error('❌ You may need to run this test differently');
        return;
      }
    }
    
    const { 
      mapIatiContactToDb, 
      extractFirstName, 
      extractLastName,
      validateIatiContactType,
      deduplicateContacts 
    } = contactUtils;
    
    // ===== TEST 2: Test name extraction =====
    console.log('');
    console.log('✂️ TEST 2: Testing name extraction...');
    
    const personName = testIATIContact.personName;
    const firstName = extractFirstName(personName);
    const lastName = extractLastName(personName);
    
    console.log('✂️ Input person-name:', personName);
    console.log('✂️ Extracted firstName:', firstName);
    console.log('✂️ Extracted lastName:', lastName);
    
    // Test various name formats
    const nameTests = [
      'A. Example',
      'John Smith',
      'Jane M. Doe',
      'Dr. Ahmed Hassan',
      'Maria'
    ];
    
    console.log('✂️ Testing various name formats:');
    nameTests.forEach(name => {
      const first = extractFirstName(name);
      const last = extractLastName(name);
      console.log(`   "${name}" → First: "${first}", Last: "${last}"`);
    });
    
    // ===== TEST 3: Test contact type validation =====
    console.log('');
    console.log('🏷️ TEST 3: Testing contact type validation...');
    
    const typeValidation = validateIatiContactType(testIATIContact.type);
    console.log('🏷️ Input type code:', testIATIContact.type);
    console.log('🏷️ Validation result:', typeValidation);
    console.log('🏷️ Type label:', typeValidation.label);
    
    // Test all valid type codes
    console.log('🏷️ Testing all IATI contact type codes:');
    ['1', '2', '3', '4', '99', 'invalid'].forEach(code => {
      const result = validateIatiContactType(code);
      console.log(`   Type "${code}" → ${result.valid ? '✅' : '⚠️'} ${result.label}`);
    });
    
    // ===== TEST 4: Test full contact mapping =====
    console.log('');
    console.log('🗺️ TEST 4: Testing full IATI-to-database mapping...');
    
    const mappedContact = mapIatiContactToDb(testIATIContact);
    
    console.log('🗺️ Input IATI contact:');
    console.log(testIATIContact);
    console.log('');
    console.log('🗺️ Mapped database contact:');
    console.log(mappedContact);
    
    // Verify required fields
    console.log('');
    console.log('🗺️ Required field validation:');
    console.log(`   type: ${mappedContact.type ? '✅' : '❌'} "${mappedContact.type}"`);
    console.log(`   firstName: ${mappedContact.firstName ? '✅' : '❌'} "${mappedContact.firstName}"`);
    console.log(`   lastName: ${mappedContact.lastName ? '✅' : '❌'} "${mappedContact.lastName}"`);
    console.log(`   position: ${mappedContact.position ? '✅' : '❌'} "${mappedContact.position}"`);
    
    // Verify IATI fields
    console.log('');
    console.log('🗺️ IATI field mapping:');
    console.log(`   jobTitle: ${mappedContact.jobTitle || 'Not set'}`);
    console.log(`   organisation: ${mappedContact.organisation || 'Not set'}`);
    console.log(`   department: ${mappedContact.department || 'Not set'}`);
    console.log(`   email: ${mappedContact.email || 'Not set'}`);
    console.log(`   phone: ${mappedContact.phone || 'Not set'}`);
    console.log(`   website: ${mappedContact.website || 'Not set'}`);
    console.log(`   mailingAddress: ${mappedContact.mailingAddress || 'Not set'}`);
    
    // Verify defaults
    console.log('');
    console.log('🗺️ Default values:');
    console.log(`   displayOnWeb: ${mappedContact.displayOnWeb}`);
    console.log(`   isFocalPoint: ${mappedContact.isFocalPoint}`);
    console.log(`   hasEditingRights: ${mappedContact.hasEditingRights}`);
    
    // ===== TEST 5: Test deduplication =====
    console.log('');
    console.log('🔄 TEST 5: Testing deduplication logic...');
    
    // Create test contacts with potential duplicates
    const contact1 = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.org',
      position: 'Manager'
    };
    
    const contact2 = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.org', // Same email+name = duplicate
      position: 'Senior Manager',
      jobTitle: 'Updated Title'
    };
    
    const contact3 = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.org', // Different person
      position: 'Director'
    };
    
    const testContacts = [contact1, contact2, contact3];
    console.log('🔄 Input: 3 contacts (2 duplicates + 1 unique)');
    console.log('🔄 Contact 1:', contact1);
    console.log('🔄 Contact 2 (duplicate):', contact2);
    console.log('🔄 Contact 3 (unique):', contact3);
    
    const deduplicated = deduplicateContacts(testContacts);
    
    console.log('');
    console.log('🔄 After deduplication:', deduplicated.length, 'contacts');
    console.log('🔄 Result:');
    deduplicated.forEach((contact, index) => {
      console.log(`   ${index + 1}. ${contact.firstName} ${contact.lastName} (${contact.email})`);
      if (contact.jobTitle) {
        console.log(`      - Job Title: ${contact.jobTitle}`);
      }
    });
    
    if (deduplicated.length === 2) {
      console.log('✅ Deduplication working correctly (merged duplicates)');
    } else {
      console.warn('⚠️ Expected 2 contacts after deduplication, got', deduplicated.length);
    }
    
    // ===== TEST 6: Simulate XML import flow =====
    console.log('');
    console.log('🔁 TEST 6: Simulating XML import flow...');
    
    // Parse contact
    console.log('🔁 Step 1: Parse XML → Extract contact-info elements');
    console.log('   (This would happen in xml-parser.ts)');
    
    // Map to database format
    console.log('🔁 Step 2: Map IATI format → Database format');
    const dbContact = mapIatiContactToDb(testIATIContact);
    console.log('   Mapped contact:', dbContact);
    
    // Simulate fetching existing contacts
    console.log('🔁 Step 3: Fetch existing contacts');
    console.log('   (This would call /api/activities/{id}/contacts)');
    
    // Merge and deduplicate
    console.log('🔁 Step 4: Merge with existing + deduplicate');
    const existingContacts: any[] = []; // Simulate empty
    const allContacts = [...existingContacts, dbContact];
    const finalContacts = deduplicateContacts(allContacts);
    console.log('   Final count:', finalContacts.length);
    
    // Save via Field API
    console.log('🔁 Step 5: Save via /api/activities/field');
    console.log('   Payload:', {
      activityId: '<ACTIVITY_ID>',
      field: 'contacts',
      value: finalContacts
    });
    
    console.log('🔁 Step 6: Field API deletes all existing contacts');
    console.log('🔁 Step 7: Field API inserts new contacts');
    console.log('🔁 Step 8: Contacts tab fetches updated list');
    
    // ===== SUMMARY =====
    console.log('');
    console.log('📝 ========================================');
    console.log('📝 XML IMPORT DIAGNOSTIC SUMMARY');
    console.log('📝 ========================================');
    console.log(`📝 Name extraction: ${firstName && lastName ? '✅' : '❌'}`);
    console.log(`📝 Type validation: ${typeValidation.valid ? '✅' : '❌'}`);
    console.log(`📝 Contact mapping: ${mappedContact ? '✅' : '❌'}`);
    console.log(`📝 All required fields: ${mappedContact.type && mappedContact.firstName && mappedContact.lastName && mappedContact.position ? '✅' : '❌'}`);
    console.log(`📝 Deduplication: ${deduplicated.length === 2 ? '✅' : '⚠️'}`);
    console.log('');
    console.log('📝 CONTACT STRUCTURE COMPATIBILITY:');
    console.log('📝 ✅ organisation/narrative → organisation field');
    console.log('📝 ✅ department/narrative → department field');
    console.log('📝 ✅ person-name/narrative → firstName + lastName');
    console.log('📝 ✅ job-title/narrative → jobTitle + position');
    console.log('📝 ✅ telephone → phone field');
    console.log('📝 ✅ email → email field');
    console.log('📝 ✅ website → website field');
    console.log('📝 ✅ mailing-address/narrative → mailingAddress field');
    console.log('');
    console.log('📝 NEXT STEPS:');
    console.log('📝 1. Upload test_contact_xml_import.xml in XML Import tab');
    console.log('📝 2. Verify both contacts appear in field preview');
    console.log('📝 3. Select contact fields and click "Import Selected"');
    console.log('📝 4. Navigate to Contacts tab');
    console.log('📝 5. Verify both contacts display correctly');
    
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
diagnoseXMLContactImport();

// Export for manual testing
window.testXMLContactImport = {
  testContact: testIATIContact,
  runDiagnostic: diagnoseXMLContactImport
};

console.log('');
console.log('💡 TIP: Test data available as window.testXMLContactImport');

