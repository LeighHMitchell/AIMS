const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { XMLParser } = require('fast-xml-parser');
require('dotenv').config({ path: '.env.local' });

// Get Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Enhanced diagnostic with all the fixes for common issues
async function runEnhancedDiagnostic(xmlFilePath) {
  console.log('🔍 IATI Transaction Import Diagnostic Tool v2.0\n');
  console.log('This tool will analyze your IATI XML and identify why transactions fail to import.\n');
  
  // Read XML file
  let xmlContent;
  try {
    xmlContent = fs.readFileSync(xmlFilePath, 'utf-8');
    console.log(`✅ Loaded XML file: ${xmlFilePath}`);
  } catch (error) {
    console.error(`❌ Failed to read XML file: ${error.message}`);
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Parse XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    trimValues: true,
    parseTrueNumberOnly: false
  });

  const parsed = parser.parse(xmlContent);
  const activities = ensureArray(parsed['iati-activities']?.['iati-activity'] || []);
  
  // Summary variables
  let totalTransactions = 0;
  let validTransactions = 0;
  let failedTransactions = 0;
  const failureReasons = {};
  const missingCurrencyTransactions = [];
  const missingActivityTransactions = [];
  
  console.log(`\n📊 Found ${activities.length} activities in the XML file\n`);
  
  // Process each activity
  for (const activity of activities) {
    const iatiIdentifier = extractIatiIdentifier(activity);
    const transactions = ensureArray(activity.transaction || []);
    
    if (transactions.length === 0) {
      console.log(`⚠️  Activity ${iatiIdentifier} has no transactions`);
      continue;
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 Activity: ${iatiIdentifier}`);
    console.log(`   Transactions: ${transactions.length}`);
    
    // Check if activity exists in database
    const { data: activityData, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('iati_id', iatiIdentifier)
      .single();
    
    const activityExists = !activityError && activityData;
    
    if (!activityExists) {
      console.log(`   ❌ Activity NOT FOUND in database!`);
      console.log(`      This activity must be imported first or auto-created.`);
    } else {
      console.log(`   ✅ Activity found in database (ID: ${activityData.id})`);
    }
    
    // Process transactions
    for (let i = 0; i < transactions.length; i++) {
      totalTransactions++;
      const transaction = transactions[i];
      const errors = [];
      const warnings = [];
      
      console.log(`\n   Transaction #${i + 1}:`);
      
      // 1. Check transaction type
      const typeCode = transaction['transaction-type']?.['@_code'] || 
                       transaction['transaction-type'];
      if (!typeCode) {
        errors.push('Missing transaction type');
        console.log(`      ❌ Type: MISSING`);
      } else {
        console.log(`      ✅ Type: ${typeCode}`);
      }
      
      // 2. Check value and currency (CRITICAL)
      const valueNode = transaction.value;
      let hasValidValue = false;
      let currency = null;
      
      if (!valueNode) {
        errors.push('Missing <value> element');
        console.log(`      ❌ Value: MISSING ELEMENT`);
      } else {
        const rawValue = valueNode['#text'] || valueNode['@_value'] || valueNode;
        currency = valueNode['@_currency'];
        
        if (!rawValue && rawValue !== 0) {
          errors.push('Missing value amount');
          console.log(`      ❌ Value: NO AMOUNT`);
        } else {
          hasValidValue = true;
          console.log(`      ✅ Value: ${rawValue}`);
        }
        
        // CRITICAL: Check currency
        if (!currency) {
          errors.push('MISSING CURRENCY ATTRIBUTE');
          console.log(`      ❌ Currency: MISSING - THIS IS REQUIRED!`);
          console.log(`         The <value> element must have currency="XXX" attribute`);
          missingCurrencyTransactions.push({
            activity: iatiIdentifier,
            transaction: i + 1,
            value: rawValue
          });
        } else {
          console.log(`      ✅ Currency: ${currency}`);
        }
      }
      
      // 3. Check date
      const dateNode = transaction['transaction-date'];
      const rawDate = dateNode?.['@_iso-date'] || dateNode;
      if (!rawDate) {
        errors.push('Missing transaction date');
        console.log(`      ❌ Date: MISSING`);
      } else {
        console.log(`      ✅ Date: ${rawDate}`);
      }
      
      // 4. Check organizations (optional but good to have)
      const providerOrg = transaction['provider-org'];
      const receiverOrg = transaction['receiver-org'];
      
      if (!providerOrg && !receiverOrg) {
        warnings.push('No provider or receiver organization specified');
        console.log(`      ⚠️  Organizations: None specified`);
      } else {
        if (providerOrg) {
          const providerName = extractNarrative(providerOrg) || providerOrg['@_ref'];
          console.log(`      ✅ Provider: ${providerName || 'unnamed'}`);
        }
        if (receiverOrg) {
          const receiverName = extractNarrative(receiverOrg) || receiverOrg['@_ref'];
          console.log(`      ✅ Receiver: ${receiverName || 'unnamed'}`);
        }
      }
      
      // 5. Check IATI classifications (optional)
      const classifications = [];
      if (transaction['aid-type']) classifications.push(`aid-type: ${transaction['aid-type']['@_code']}`);
      if (transaction['flow-type']) classifications.push(`flow-type: ${transaction['flow-type']['@_code']}`);
      if (transaction['tied-status']) classifications.push(`tied-status: ${transaction['tied-status']['@_code']}`);
      if (transaction['finance-type']) classifications.push(`finance-type: ${transaction['finance-type']['@_code']}`);
      if (transaction['disbursement-channel']) classifications.push(`channel: ${transaction['disbursement-channel']['@_code']}`);
      
      if (classifications.length > 0) {
        console.log(`      ℹ️  Classifications: ${classifications.join(', ')}`);
      }
      
      // Activity check
      if (!activityExists) {
        errors.push('Activity not found in database');
        missingActivityTransactions.push({
          activity: iatiIdentifier,
          transaction: i + 1
        });
      }
      
      // Determine if transaction would succeed
      if (errors.length === 0) {
        validTransactions++;
        console.log(`      ✅ STATUS: Would import successfully`);
      } else {
        failedTransactions++;
        console.log(`      ❌ STATUS: Would FAIL - ${errors.join(', ')}`);
        
        // Track failure reasons
        errors.forEach(error => {
          failureReasons[error] = (failureReasons[error] || 0) + 1;
        });
      }
      
      if (warnings.length > 0) {
        console.log(`      ⚠️  Warnings: ${warnings.join(', ')}`);
      }
    }
  }
  
  // Print summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Transactions Analyzed: ${totalTransactions}`);
  console.log(`✅ Would Import Successfully: ${validTransactions}`);
  console.log(`❌ Would Fail: ${failedTransactions}`);
  console.log(`Success Rate: ${totalTransactions > 0 ? Math.round(validTransactions / totalTransactions * 100) : 0}%`);
  
  if (Object.keys(failureReasons).length > 0) {
    console.log('\n🔍 Failure Reasons:');
    Object.entries(failureReasons)
      .sort((a, b) => b[1] - a[1])
      .forEach(([reason, count]) => {
        console.log(`   ${reason}: ${count} transactions`);
      });
  }
  
  // Critical issues
  if (missingCurrencyTransactions.length > 0) {
    console.log('\n🚨 CRITICAL: Transactions Missing Currency:');
    console.log('These transactions WILL FAIL because currency is required:');
    missingCurrencyTransactions.slice(0, 10).forEach(t => {
      console.log(`   - Activity: ${t.activity}, Transaction #${t.transaction}, Value: ${t.value}`);
    });
    if (missingCurrencyTransactions.length > 10) {
      console.log(`   ... and ${missingCurrencyTransactions.length - 10} more`);
    }
  }
  
  if (missingActivityTransactions.length > 0) {
    console.log('\n🚨 Activities Not Found in Database:');
    const uniqueActivities = [...new Set(missingActivityTransactions.map(t => t.activity))];
    console.log(`${uniqueActivities.length} activities need to be imported first:`);
    uniqueActivities.slice(0, 10).forEach(a => {
      console.log(`   - ${a}`);
    });
    if (uniqueActivities.length > 10) {
      console.log(`   ... and ${uniqueActivities.length - 10} more`);
    }
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (failureReasons['MISSING CURRENCY ATTRIBUTE'] > 0) {
    console.log('\n1. Fix Missing Currency (CRITICAL):');
    console.log('   All <value> elements MUST have a currency attribute.');
    console.log('   Example: <value currency="USD">150000</value>');
    console.log('   This is the #1 reason for import failures!');
  }
  
  if (failureReasons['Activity not found in database'] > 0) {
    console.log('\n2. Import Activities First:');
    console.log('   - Import the activities before importing transactions');
    console.log('   - Or enable auto-creation in your import settings');
    console.log('   - Ensure IATI identifiers match exactly');
  }
  
  if (failureReasons['Missing transaction type'] > 0) {
    console.log('\n3. Add Transaction Types:');
    console.log('   All transactions need a type code (1-13)');
    console.log('   Example: <transaction-type code="3"/> for Disbursement');
  }
  
  if (failureReasons['Missing transaction date'] > 0) {
    console.log('\n4. Add Transaction Dates:');
    console.log('   Use ISO format: <transaction-date iso-date="2024-06-12"/>');
  }
  
  console.log('\n✅ Once these issues are fixed, re-run this diagnostic to verify.');
  console.log('='.repeat(80));
}

// Helper functions
function ensureArray(item) {
  return Array.isArray(item) ? item : [item];
}

function extractIatiIdentifier(activity) {
  const identifier = activity['iati-identifier'];
  if (typeof identifier === 'string') return identifier;
  if (identifier?.['#text']) return identifier['#text'];
  return 'unknown';
}

function extractNarrative(node) {
  if (!node) return null;
  
  if (typeof node === 'string') return node;
  
  const narrative = node.narrative;
  if (narrative) {
    if (typeof narrative === 'string') return narrative;
    if (narrative['#text']) return narrative['#text'];
    if (Array.isArray(narrative) && narrative[0]) {
      return narrative[0]['#text'] || narrative[0];
    }
  }
  
  return node['#text'] || null;
}

// Main execution
const xmlFile = process.argv[2];

if (!xmlFile) {
  console.log('Usage: node diagnose-transactions-v2.js <path-to-xml-file>');
  console.log('Example: node diagnose-transactions-v2.js sample-transactions.xml');
  process.exit(1);
}

runEnhancedDiagnostic(xmlFile); 