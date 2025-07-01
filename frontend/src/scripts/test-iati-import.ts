#!/usr/bin/env tsx
/**
 * Test script for IATI Import API endpoint
 * This demonstrates how to use the /api/activities/[id]/import-iati endpoint
 * 
 * Usage: npm run test-iati-import <activity-id>
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

async function testIATIImport(activityId: string) {
  console.log('\n🔍 Testing IATI Import API');
  console.log('=============================');
  
  // First, run the compare to get IATI data
  const compareUrl = `http://localhost:3000/api/activities/${activityId}/compare-iati`;
  
  console.log('\n1️⃣  Fetching IATI data via compare endpoint...');
  
  try {
    const compareResponse = await fetch(compareUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (!compareResponse.ok) {
      const error = await compareResponse.json();
      console.error('❌ Compare failed:', error);
      return;
    }
    
    const compareResult = await compareResponse.json();
    
    if (!compareResult.iati_data) {
      console.error('❌ No IATI data found for this activity');
      return;
    }
    
    console.log('✅ IATI data fetched successfully');
    console.log('\n📊 Available fields to import:');
    console.log('  - title_narrative:', !!compareResult.iati_data.title_narrative);
    console.log('  - description_narrative:', !!compareResult.iati_data.description_narrative);
    console.log('  - activity_status:', !!compareResult.iati_data.activity_status);
    console.log('  - sectors:', compareResult.iati_data.sectors?.length || 0);
    console.log('  - participating_orgs:', compareResult.iati_data.participating_orgs?.length || 0);
    console.log('  - transactions:', compareResult.iati_data.transactions?.length || 0);
    
    // Now test the import endpoint
    const importUrl = `http://localhost:3000/api/activities/${activityId}/import-iati`;
    
    console.log('\n2️⃣  Testing import with selected fields...');
    
    // Example: Import title, description, and transactions
    const importPayload = {
      fields: {
        title_narrative: true,
        description_narrative: true,
        activity_status: true,
        activity_date_start_planned: true,
        activity_date_end_planned: true,
        sectors: true,
        participating_orgs: false, // Skip orgs in this test
        transactions: true
      },
      iati_data: compareResult.iati_data
    };
    
    const importResponse = await fetch(importUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(importPayload)
    });
    
    if (!importResponse.ok) {
      const error = await importResponse.json();
      console.error('❌ Import failed:', error);
      return;
    }
    
    const importResult = await importResponse.json();
    
    console.log('\n✅ Import completed successfully!');
    console.log('============================');
    console.log('\n📋 Import Summary:');
    console.log('  - Fields requested:', importResult.summary.total_fields_requested);
    console.log('  - Fields updated:', importResult.summary.total_fields_updated);
    console.log('  - Sectors updated:', importResult.summary.sectors_updated);
    console.log('  - Transactions added:', importResult.summary.transactions_added);
    console.log('  - Sync status:', importResult.summary.sync_status);
    console.log('  - Last sync time:', new Date(importResult.summary.last_sync_time).toLocaleString());
    
    console.log('\n📝 Updated fields:', importResult.fields_updated);
    
    // Test partial import (only transactions)
    console.log('\n3️⃣  Testing partial import (transactions only)...');
    
    const partialImportPayload = {
      fields: {
        transactions: true
      },
      iati_data: compareResult.iati_data
    };
    
    const partialResponse = await fetch(importUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(partialImportPayload)
    });
    
    if (partialResponse.ok) {
      const partialResult = await partialResponse.json();
      console.log('✅ Partial import successful');
      console.log('  - New transactions added:', partialResult.summary.transactions_added);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const activityId = args[0];

if (!activityId) {
  console.error('Usage: npm run test-iati-import <activity-id>');
  console.error('\nExample:');
  console.error('  npm run test-iati-import 123e4567-e89b-12d3-a456-426614174000');
  process.exit(1);
}

testIATIImport(activityId)
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }); 