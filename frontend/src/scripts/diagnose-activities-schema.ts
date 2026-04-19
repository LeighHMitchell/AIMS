import { getSupabaseAdmin } from '@/lib/supabase';

async function diagnoseActivitiesSchema() {
  
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    console.error('❌ Supabase client not configured');
    return;
  }

  try {
    // Check if general_info column exists
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'activities')
      .order('ordinal_position');

    if (columnsError) {
      console.error('❌ Error fetching columns:', columnsError);
      return;
    }

    columns?.forEach((col: any) => {
      const indicator = col.column_name === 'general_info' ? '✅' : '  ';
    });

    const hasGeneralInfo = columns?.some((col: any) => col.column_name === 'general_info');
    
    if (!hasGeneralInfo) {
    } else {
    }

    // Test a simple query to see if there are any other issues
    const { data: testActivity, error: testError } = await supabase
      .from('activities')
      .select('id, title, general_info')
      .limit(1)
      .single();

    if (testError) {
      console.error('❌ Error with simple query:', testError);
      
      if (testError.message?.includes('general_info')) {
      }
    } else {
    }

    // Test creating a minimal activity
    const testData = {
      title: 'Test Activity - Delete Me',
      publication_status: 'draft',
      submission_status: 'not_submitted',
      activity_status: '1',
      general_info: {}
    };

    const { data: createdActivity, error: createError } = await supabase
      .from('activities')
      .insert([testData])
      .select('id, title')
      .single();

    if (createError) {
      console.error('❌ Error creating test activity:', createError);
      
      if (createError.message?.includes('general_info')) {
      }
    } else {
      
      // Clean up test activity
      await supabase
        .from('activities')
        .delete()
        .eq('id', createdActivity.id);
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

// Export for direct usage
export { diagnoseActivitiesSchema };

// Run if called directly
if (require.main === module) {
  diagnoseActivitiesSchema();
}
