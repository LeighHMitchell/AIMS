import { getSupabaseAdmin } from '@/lib/supabase';

async function diagnoseActivitiesSchema() {
  console.log('🔍 Diagnosing activities table schema...');
  
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    console.error('❌ Supabase client not configured');
    return;
  }

  try {
    // Check if general_info column exists
    console.log('\n📋 Checking activities table columns...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'activities')
      .order('ordinal_position');

    if (columnsError) {
      console.error('❌ Error fetching columns:', columnsError);
      return;
    }

    console.log('📊 Activities table columns:');
    columns?.forEach((col: any) => {
      const indicator = col.column_name === 'general_info' ? '✅' : '  ';
      console.log(`${indicator} ${col.column_name} (${col.data_type})`);
    });

    const hasGeneralInfo = columns?.some((col: any) => col.column_name === 'general_info');
    
    if (!hasGeneralInfo) {
      console.log('\n❌ general_info column is MISSING from activities table');
      console.log('🔧 You need to run the migration: frontend/supabase/migrations/20250125000000_add_general_info_column.sql');
    } else {
      console.log('\n✅ general_info column exists');
    }

    // Test a simple query to see if there are any other issues
    console.log('\n🧪 Testing simple activities query...');
    const { data: testActivity, error: testError } = await supabase
      .from('activities')
      .select('id, title, general_info')
      .limit(1)
      .single();

    if (testError) {
      console.error('❌ Error with simple query:', testError);
      
      if (testError.message?.includes('general_info')) {
        console.log('🔧 The general_info column issue is confirmed. Please run the migration.');
      }
    } else {
      console.log('✅ Simple query works fine');
      console.log('📄 Sample activity:', { id: testActivity?.id, title: testActivity?.title });
    }

    // Test creating a minimal activity
    console.log('\n🧪 Testing activity creation...');
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
        console.log('🔧 Confirmed: general_info column is missing');
      }
    } else {
      console.log('✅ Test activity created successfully:', createdActivity);
      
      // Clean up test activity
      await supabase
        .from('activities')
        .delete()
        .eq('id', createdActivity.id);
      console.log('🧹 Test activity cleaned up');
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
