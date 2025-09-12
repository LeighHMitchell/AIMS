#!/usr/bin/env node

/**
 * Setup script to initialize IATI-compliant policy markers
 * Run this script to migrate the database to IATI standards
 */

const http = require('http');

async function setupIATIPolicyMarkers() {
  console.log('🚀 Setting up IATI Policy Markers...');
  
  try {
    // Make POST request to setup API
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/setup-iati-policy-markers',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success) {
            console.log('✅ IATI Policy Markers setup completed successfully!');
            console.log(`📊 Created ${response.markersCreated} IATI standard markers`);
            console.log('🎯 Your policy markers are now IATI compliant');
            console.log('');
            console.log('📋 Next steps:');
            console.log('1. The Policy Markers tab now uses IATI standard codes');
            console.log('2. Significance levels support 0-4 range (4 only for RMNCH)');
            console.log('3. All markers include vocabulary and IATI code information');
            console.log('4. Ready for IATI XML import/export (future implementation)');
          } else {
            console.error('❌ Setup failed:', response.error);
          }
        } catch (error) {
          console.error('❌ Error parsing response:', error);
          console.log('Raw response:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      console.log('💡 Make sure your development server is running on http://localhost:3000');
    });

    req.end();

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
console.log('🔧 IATI Policy Markers Migration Tool');
console.log('📋 This will update your database to be IATI compliant');
console.log('📖 Based on official IATI Policy Marker codelist');
console.log('🌐 https://iatistandard.org/en/iati-standard/203/codelists/policymarker/');
console.log('');

setupIATIPolicyMarkers();
