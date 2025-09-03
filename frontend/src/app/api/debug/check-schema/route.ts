import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('[Schema Check] Checking if default fields exist in activities table...');
    
    const supabase = getSupabaseAdmin();
    
    // Check if the columns exist by trying to select them
    const { data: testData, error: testError } = await supabase
      .from('activities')
      .select('id, default_aid_type, default_finance_type, default_flow_type, default_currency, default_tied_status, default_modality, default_modality_override')
      .limit(1);
    
    if (testError) {
      console.error('[Schema Check] Error querying columns:', testError);
      
      // Try to add the missing columns
      console.log('[Schema Check] Attempting to add missing columns...');
      
      const { error: alterError } = await supabase.rpc('sql', {
        query: `
          -- Add default_aid_type if it doesn't exist
          ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_aid_type VARCHAR(10) NULL;
          
          -- Add default_finance_type if it doesn't exist
          ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_finance_type VARCHAR(10) NULL;
          
          -- Add default_flow_type if it doesn't exist
          ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_flow_type VARCHAR(10) NULL;
          
          -- Add default_currency if it doesn't exist
          ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) NULL;
          
          -- Add default_tied_status if it doesn't exist
          ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_tied_status VARCHAR(10) NULL;
          
          -- Add modality fields if they don't exist
          ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_modality VARCHAR(10) NULL;
          ALTER TABLE activities ADD COLUMN IF NOT EXISTS default_modality_override BOOLEAN DEFAULT FALSE;
        `
      });
      
      if (alterError) {
        console.error('[Schema Check] Error adding columns:', alterError);
        return NextResponse.json({
          success: false,
          error: 'Could not add missing columns',
          details: alterError.message,
          originalError: testError.message
        });
      }
      
      console.log('[Schema Check] Successfully added missing columns');
      return NextResponse.json({
        success: true,
        message: 'Missing columns were added successfully',
        action: 'added_columns'
      });
    }
    
    console.log('[Schema Check] All default field columns exist');
    return NextResponse.json({
      success: true,
      message: 'All default field columns exist in the activities table',
      action: 'no_action_needed'
    });
    
  } catch (error) {
    console.error('[Schema Check] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error during schema check',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}