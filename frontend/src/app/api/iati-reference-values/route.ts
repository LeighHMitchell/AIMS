import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-simple';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fieldName = searchParams.get('field_name');
    
    const supabase = createClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' }, 
        { status: 500 }
      );
    }
    
    // Call the database function to get reference values
    const { data, error } = await supabase
      .rpc('get_iati_reference_values', fieldName ? { p_field_name: fieldName } : {});

    if (error) {
      console.error('Error fetching IATI reference values:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reference values' }, 
        { status: 500 }
      );
    }

    // Transform the data for easier consumption by the frontend
    if (fieldName) {
      // Return just the values for a specific field
      return NextResponse.json({
        field: fieldName,
        values: data || []
      });
    } else {
      // Return all values grouped by field
      const groupedData = data?.reduce((acc: any, item: any) => {
        if (!acc[item.field_name]) {
          acc[item.field_name] = [];
        }
        acc[item.field_name].push({
          code: item.code,
          name: item.name
        });
        return acc;
      }, {}) || {};

      return NextResponse.json({
        fields: groupedData
      });
    }
  } catch (error) {
    console.error('Error in IATI reference values API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}