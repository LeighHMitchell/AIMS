// Test script to verify location_ref import
const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity xml:lang="en" default-currency="USD">
    <iati-identifier>TEST-LOCATION-REF-001</iati-identifier>
    <title>
      <narrative>Test Location Reference Import</narrative>
    </title>
    
    <location ref="AF-KAN">
      <location-reach code="1" />
      <name>
        <narrative>Test Location with Ref</narrative>
      </name>
      <point srsName="http://www.opengis.net/def/crs/EPSG/0/4326">
        <pos>31.616944 65.716944</pos>
      </point>
      <exactness code="1"/>
      <location-class code="2"/>
      <feature-designation code="ADMF"/>
    </location>
  </iati-activity>
</iati-activities>`;

console.log('🧪 Test XML for location_ref import:');
console.log(testXML);
console.log('\n🔍 Expected location_ref value: "AF-KAN"');
