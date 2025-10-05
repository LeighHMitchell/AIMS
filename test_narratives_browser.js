// Test Multilingual Narratives - Run this in Browser Console
// Copy and paste this entire script into your browser console

console.log('🔍 Testing Multilingual Narratives Flow...\n');

// Step 1: Get the activity ID from the URL
const activityId = window.location.pathname.split('/')[2];
console.log('📋 Activity ID:', activityId);

if (!activityId) {
  console.error('❌ Could not find activity ID in URL');
} else {
  // Step 2: Fetch participating organizations
  console.log('\n📡 Fetching participating organizations...');
  
  fetch(`/api/activities/${activityId}/participating-organizations`)
    .then(response => {
      console.log('📊 API Response Status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('📦 API Response Data:', data);
      
      // Step 3: Find Agency A
      const agencyA = data.find(org => 
        org.narrative?.includes('Agency A') || 
        org.organization?.name?.includes('Agency A')
      );
      
      if (!agencyA) {
        console.error('❌ Agency A not found in response');
        console.log('Available organizations:', data.map(o => o.narrative || o.organization?.name));
      } else {
        console.log('\n✅ Found Agency A:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Name:', agencyA.narrative);
        console.log('IATI Role Code:', agencyA.iati_role_code);
        console.log('Org Activity ID:', agencyA.org_activity_id);
        console.log('Activity ID Ref:', agencyA.activity_id_ref);
        console.log('CRS Channel Code:', agencyA.crs_channel_code);
        console.log('\n📝 NARRATIVES FIELD:');
        console.log('Type:', typeof agencyA.narratives);
        console.log('Value:', agencyA.narratives);
        console.log('Is Array?:', Array.isArray(agencyA.narratives));
        
        if (agencyA.narratives) {
          console.log('Length:', agencyA.narratives.length);
          if (agencyA.narratives.length > 0) {
            console.log('First item:', agencyA.narratives[0]);
          }
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Step 4: Analysis
        console.log('\n🔍 ANALYSIS:');
        if (agencyA.narratives === null) {
          console.log('❌ narratives is NULL');
          console.log('   → Not imported or not in database');
          console.log('   → Check database with SQL query');
        } else if (agencyA.narratives === undefined) {
          console.log('❌ narratives is UNDEFINED');
          console.log('   → API not returning this field');
          console.log('   → Check API GET handler');
        } else if (Array.isArray(agencyA.narratives) && agencyA.narratives.length === 0) {
          console.log('⚠️  narratives is EMPTY ARRAY');
          console.log('   → Imported but no multilingual names found');
          console.log('   → Check snippet parser extraction logic');
        } else if (typeof agencyA.narratives === 'string') {
          console.log('❌ narratives is STRING (should be array)');
          console.log('   → API not parsing JSONB correctly');
          console.log('   → Need to JSON.parse() in API GET handler');
        } else if (Array.isArray(agencyA.narratives) && agencyA.narratives.length > 0) {
          console.log('✅ narratives has DATA!');
          console.log('   → Data exists in API response');
          console.log('   → Check if modal is receiving it');
          console.log('   → Check modal rendering logic');
        } else {
          console.log('❓ narratives has unexpected type/value');
          console.log('   → Need manual investigation');
        }
        
        // Step 5: Expected vs Actual
        console.log('\n📊 EXPECTED vs ACTUAL:');
        console.log('Expected: [{ lang: "fr", text: "Nom de l\'agence A" }]');
        console.log('Actual:  ', JSON.stringify(agencyA.narratives));
      }
    })
    .catch(error => {
      console.error('❌ Error fetching data:', error);
    });
}

console.log('\n⏳ Waiting for API response...');
