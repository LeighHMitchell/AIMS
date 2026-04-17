// Test script to check if the department column exists and can be updated
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDepartmentColumn() {
  try {
    
    // First, check if the column exists by trying to select it
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'users' });
    
    if (columnError) {
      
      // Try a simple select with department column
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id, email, department')
        .limit(1);
      
      if (testError) {
        console.error('Department column does not exist or cannot be accessed:', testError);
        return false;
      } else {
        return true;
      }
    } else {
      const departmentColumn = columns?.find((col: any) => col.column_name === 'department');
      if (departmentColumn) {
        return true;
      } else {
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
  process.exit(result ? 0 : 1);
});
