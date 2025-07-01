#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStructure() {
  // Check transaction table structure
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Transaction table has data:', data.length > 0);
    if (data.length > 0) {
      console.log('Transaction columns:', Object.keys(data[0]));
      console.log('\nSample transaction:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  }
}

checkStructure().catch(console.error);