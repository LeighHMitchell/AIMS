import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🔍 Testing Supabase Connection...\n');

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment Variables:');
console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.log('\n❌ Missing environment variables!');
  console.log('\n📝 Please update your .env.local file:');
  console.log('   Remove the # symbols and add your actual values:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=your_actual_url');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_key');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_key');
  process.exit(1);
}

// Test connection with anon key
async function testConnection() {
  console.log('\n🔄 Testing connection with anon key...');
  try {
    const supabaseAnon = createClient(supabaseUrl!, supabaseAnonKey!);
    const { count, error } = await supabaseAnon
    .from('activities')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log('❌ Anon connection error:', error.message);
  } else {
    console.log('✅ Anon connection successful! Activities count:', count);
  }
} catch (err) {
  console.log('❌ Anon connection failed:', err);
}

// Test connection with service key
console.log('\n🔄 Testing connection with service key...');
try {
  const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);
  const { count, error } = await supabaseAdmin
    .from('activities')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log('❌ Service key connection error:', error.message);
  } else {
    console.log('✅ Service key connection successful! Activities count:', count);
  }
} catch (err) {
  console.log('❌ Service key connection failed:', err);
}

// Test transaction summaries view
console.log('\n🔄 Testing transaction summaries view...');
try {
  const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);
  const { data, error } = await supabaseAdmin
    .from('activity_transaction_summaries')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('❌ Transaction summaries view error:', error.message);
    console.log('   This view may not exist yet. Run the migration in Supabase dashboard.');
  } else {
    console.log('✅ Transaction summaries view exists!');
    if (data && data.length > 0) {
      console.log('   Sample data:', data[0]);
    }
  }
} catch (err) {
  console.log('❌ Transaction summaries test failed:', err);
}

// Test transactions table
console.log('\n🔄 Testing transactions table...');
try {
  const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);
  const { count, error } = await supabaseAdmin
    .from('transactions')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log('❌ Transactions table error:', error.message);
  } else {
    console.log('✅ Transactions table accessible! Transaction count:', count);
  }
} catch (err) {
  console.log('❌ Transactions test failed:', err);
}

  console.log('\n✨ Connection test complete!');
}

// Run the test
testConnection();