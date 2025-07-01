#!/usr/bin/env tsx
/**
 * Test script for IATI Compare API endpoint
 * This demonstrates how to use the /api/activities/[id]/compare-iati endpoint
 * 
 * Usage: npm run test-iati-compare <activity-id> [iati-identifier]
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testIATICompare(activityId: string, iatiIdentifier?: string) {
  console.log('\n🔍 Testing IATI Compare API');
  console.log('============================');
  
  // First, fetch the activity to get its details
  const { data: activity, error } = await supabase
    .from('activities')
    .select('id, title, iati_id')
    .eq('id', activityId)
    .single();
  
  if (error || !activity) {
    console.error('❌ Activity not found:', activityId);
    return;
  }
  
  console.log('\n📋 Activity Details:');
  console.log('  - ID:', activity.id);
  console.log('  - Title:', activity.title);
  console.log('  - IATI ID:', activity.iati_id || 'Not set');
  
  // Simulate API call (in real app, you'd use fetch or axios)
  const apiUrl = `http://localhost:3000/api/activities/${activityId}/compare-iati`;
  
  console.log('\n🌐 Making API request to:', apiUrl);
  
  const payload = {
    iati_identifier: iatiIdentifier // Optional - will use activity's iati_id if not provided
  };
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('\n❌ API Error:', error);
      return;
    }
    
    const result = await response.json();
    
    console.log('\n✅ Comparison Results:');
    console.log('====================');
    
    // Show local data summary
    console.log('\n📊 Your Data:');
    console.log('  - Title:', result.your_data.title_narrative);
    console.log('  - Status:', result.your_data.activity_status);
    console.log('  - Start Date:', result.your_data.activity_date_start_planned);
    console.log('  - End Date:', result.your_data.activity_date_end_planned);
    console.log('  - Sectors:', result.your_data.sectors.length);
    console.log('  - Organizations:', result.your_data.participating_orgs.length);
    console.log('  - Transactions:', result.your_data.transactions.length);
    
    // Show IATI data summary if available
    if (result.iati_data) {
      console.log('\n🌍 IATI Data:');
      console.log('  - Title:', result.iati_data.title_narrative);
      console.log('  - Status:', result.iati_data.activity_status);
      console.log('  - Start Date:', result.iati_data.activity_date_start_planned);
      console.log('  - End Date:', result.iati_data.activity_date_end_planned);
      console.log('  - Sectors:', result.iati_data.sectors.length);
      console.log('  - Organizations:', result.iati_data.participating_orgs.length);
      console.log('  - Transactions:', result.iati_data.transactions.length);
      
      // Show differences
      if (result.comparison.differences) {
        console.log('\n🔄 Differences Found:');
        Object.entries(result.comparison.differences).forEach(([field, diff]: [string, any]) => {
          console.log(`  - ${field}:`);
          console.log(`    Local: ${diff.local || 'null'}`);
          console.log(`    IATI: ${diff.iati || 'null'}`);
        });
      }
    } else {
      console.log('\n⚠️  No IATI data found');
      if (result.comparison.iati_error) {
        console.log('  Error:', result.comparison.iati_error);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const activityId = args[0];
const iatiIdentifier = args[1];

if (!activityId) {
  console.error('Usage: npm run test-iati-compare <activity-id> [iati-identifier]');
  console.error('\nExample:');
  console.error('  npm run test-iati-compare 123e4567-e89b-12d3-a456-426614174000');
  console.error('  npm run test-iati-compare 123e4567-e89b-12d3-a456-426614174000 MM-GOV-1234');
  process.exit(1);
}

testIATICompare(activityId, iatiIdentifier)
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }); 