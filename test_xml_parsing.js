#!/usr/bin/env node

const { IATIXMLParser } = require('./frontend/src/lib/xml-parser');

// Your exact XML content
const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities>
  <iati-activity>
    <iati-identifier>TEST-ACTIVITY</iati-identifier>
    <title>
      <narrative>Test Activity</narrative>
    </title>
    
    <!--participating-org starts-->
    <participating-org ref="BB-BBB-123456789" role="1" type="40" activity-id="BB-BBB-123456789-1234">
     <narrative>Name of Agency B</narrative>
    </participating-org>
    <participating-org ref="CC-CCC-123456789" role="2" type="10" activity-id="CC-CCC-123456789-1234">
     <narrative>Name of Agency C</narrative>
    </participating-org>
    <participating-org ref="AA-AAA-123456789" role="3" type="21" activity-id="AA-AAA-123456789-1234" crs-channel-code="000000">
     <narrative>Name of Agency A</narrative>
     <narrative xml:lang="fr">Nom de l'agence A</narrative>
    </participating-org>
    <!--participating-org ends-->
    
  </iati-activity>
</iati-activities>`;

async function testXMLParsing() {
  console.log('🧪 Testing XML parsing with your exact content...');
  
  try {
    const parser = new IATIXMLParser();
    await parser.loadXML(xmlContent);
    
    const result = parser.parseActivity();
    
    console.log('📋 Parsed activity result:');
    console.log('  IATI Identifier:', result.iatiIdentifier);
    console.log('  Title:', result.title);
    
    if (result.participatingOrgs && result.participatingOrgs.length > 0) {
      console.log(`\n🎯 Found ${result.participatingOrgs.length} participating organizations:`);
      result.participatingOrgs.forEach((org, index) => {
        console.log(`  ${index + 1}. Ref: ${org.ref}, Role: ${org.role}, Type: ${org.type}, Narrative: ${org.narrative}`);
      });
    } else {
      console.log('\n❌ No participating organizations found in parsed result');
    }
    
  } catch (error) {
    console.error('❌ Error parsing XML:', error);
  }
}

testXMLParsing();
