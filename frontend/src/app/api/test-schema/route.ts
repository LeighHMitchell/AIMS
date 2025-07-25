import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Check table structure
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'activity_sectors' });

    if (columnsError) {
      // Fallback query using information_schema
      const { data: fallbackColumns, error: fallbackError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'activity_sectors')
        .order('ordinal_position');

      if (fallbackError) {
        console.error('Schema query error:', fallbackError);
        return NextResponse.json(
          { error: `Schema query failed: ${fallbackError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        table: 'activity_sectors',
        columns: fallbackColumns || [],
        hasNewSchema: fallbackColumns?.some((col: any) => col.column_name === 'sector_percentage') || false,
        hasOldSchema: fallbackColumns?.some((col: any) => col.column_name === 'percentage') || false,
        method: 'information_schema',
        timestamp: new Date().toISOString()
      });
    }

    // Check for specific columns
    const hasNewSchema = columns?.some((col: any) => col.column_name === 'sector_percentage') || false;
    const hasOldSchema = columns?.some((col: any) => col.column_name === 'percentage') || false;

    return NextResponse.json({
      table: 'activity_sectors',
      columns: columns || [],
      hasNewSchema,
      hasOldSchema,
      schemaStatus: hasNewSchema ? 'NEW_SCHEMA' : hasOldSchema ? 'OLD_SCHEMA' : 'UNKNOWN',
      method: 'rpc',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Schema test error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 