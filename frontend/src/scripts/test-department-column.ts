// Test script to check if the department column exists and can be updated
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDepartmentColumn() {
  try {
    console.log('Testing department column...');
    
    // First, check if the column exists by trying to select it
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'users' });
    
    if (columnError) {
      console.log('Could not check columns via RPC, trying direct query...');
      
      // Try a simple select with department column
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id, email, department')
        .limit(1);
      
      if (testError) {
        console.error('Department column does not exist or cannot be accessed:', testError);
        return false;
      } else {
        console.log('Department column exists and can be queried:', testData);
        return true;
      }
    } else {
      console.log('Table columns:', columns);
      const departmentColumn = columns?.find((col: any) => col.column_name === 'department');
      if (departmentColumn) {
        console.log('Department column found:', departmentColumn);
        return true;
      } else {
        console.log('Department column not found in table schema');
        return false;
      }
    }
  } catch (error) {
    console.error('Error testing department column:', error);
    return false;
  }
}

// Run the test
testDepartmentColumn().then(result => {
  console.log('Department column test result:', result);
  process.exit(result ? 0 : 1);
});
