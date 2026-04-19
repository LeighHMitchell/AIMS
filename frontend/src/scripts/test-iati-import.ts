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
  
  // First, run the compare to get IATI data
  const compareUrl = `http://localhost:3000/api/activities/${activityId}/compare-iati`;
  
  
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
    
    
    // Now test the import endpoint
    const importUrl = `http://localhost:3000/api/activities/${activityId}/import-iati`;
    
    
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
    
    
    
    // Test partial import (only transactions)
    
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
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }); 