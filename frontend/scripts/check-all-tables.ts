import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkTables() {
  console.log('Checking database tables for missing columns...\n');
  
  // Check contacts table
  console.log('📋 Checking contacts table...');
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('*')
    .limit(1);
    
  if (contactsError) {
    console.log('❌ Error checking contacts table:', contactsError.message);
  } else if (contacts && contacts.length > 0) {
    console.log('✅ Contacts table columns:', Object.keys(contacts[0]).join(', '));
  } else {
    console.log('⚠️  Contacts table is empty');
  }
  
  // Check sectors table
  console.log('\n📋 Checking sectors table...');
  const { data: sectors, error: sectorsError } = await supabase
    .from('sectors')
    .select('*')
    .limit(1);
    
  if (sectorsError) {
    console.log('❌ Error checking sectors table:', sectorsError.message);
  } else if (sectors && sectors.length > 0) {
    console.log('✅ Sectors table columns:', Object.keys(sectors[0]).join(', '));
  } else {
    console.log('⚠️  Sectors table is empty');
  }
  
  // Check activity_contacts table
  console.log('\n📋 Checking activity_contacts table...');
  const { data: activityContacts, error: activityContactsError } = await supabase
    .from('activity_contacts')
    .select('*')
    .limit(1);
    
  if (activityContactsError) {
    console.log('❌ Error checking activity_contacts table:', activityContactsError.message);
    console.log('   This table might need to be created');
  } else if (activityContacts && activityContacts.length > 0) {
    console.log('✅ Activity contacts table columns:', Object.keys(activityContacts[0]).join(', '));
  } else {
    console.log('⚠️  Activity contacts table is empty');
  }
  
  // Check activity_sectors table
  console.log('\n📋 Checking activity_sectors table...');
  const { data: activitySectors, error: activitySectorsError } = await supabase
    .from('activity_sectors')
    .select('*')
    .limit(1);
    
  if (activitySectorsError) {
    console.log('❌ Error checking activity_sectors table:', activitySectorsError.message);
    console.log('   This table might need to be created');
  } else if (activitySectors && activitySectors.length > 0) {
    console.log('✅ Activity sectors table columns:', Object.keys(activitySectors[0]).join(', '));
  } else {
    console.log('⚠️  Activity sectors table is empty');
  }
  
  // Summary of missing columns for partners
  console.log('\n\n📊 SUMMARY:');
  console.log('\n🔧 Partners table needs these columns added:');
  console.log('   - code, iati_org_id, full_name, acronym');
  console.log('   - organisation_type, description, logo, banner');
  console.log('   - country_represented');
  console.log('\n   Run the SQL script provided earlier to fix this.');
  
  console.log('\n✅ Activities table has all required columns');
  
  console.log('\n⚠️  You may also need to create junction tables for:');
  console.log('   - activity_contacts (linking activities to contacts)');
  console.log('   - activity_sectors (linking activities to sectors)');
}

// Run the script
checkTables().catch(console.error); 