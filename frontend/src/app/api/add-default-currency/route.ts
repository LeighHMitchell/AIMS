import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    // Check if column already exists
    const checkColumnSQL = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'activities' 
      AND column_name = 'default_currency';
    `;
    
    const { data: columnExists, error: checkError } = await supabase.rpc('exec', { 
      sql: checkColumnSQL 
    });
    
    if (checkError) {
      // If exec doesn't work, try a different approach
      console.log('Using alternative check method...');
      
      // Try to select the column
      const { error: selectError } = await supabase
        .from('activities')
        .select('default_currency')
        .limit(1);
      
      // If column doesn't exist, selectError will have code 42703
      if (selectError?.code !== '42703') {
        return NextResponse.json({
          success: true,
          message: 'Column default_currency already exists'
        });
      }
    } else if (columnExists && columnExists.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Column default_currency already exists'
      });
    }
    
    // Add the column
    const addColumnSQL = `
      ALTER TABLE activities 
      ADD COLUMN default_currency VARCHAR(3);
      
      COMMENT ON COLUMN activities.default_currency IS 
      'Default currency code (ISO 4217) for all monetary values in this activity per IATI standards';
    `;
    
    const { error: alterError } = await supabase.rpc('exec', { 
      sql: addColumnSQL 
    });
    
    if (alterError) {
      throw alterError;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Successfully added default_currency column to activities table'
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 