import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = getSupabaseAdmin()

    console.log('[Migration] Adding inherited flag columns...')

    // Execute the SQL to add columns
    const { error } = await supabase.rpc('exec_sql', {
      sql_string: `
        ALTER TABLE transactions
          ADD COLUMN IF NOT EXISTS flow_type_inherited BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS aid_type_inherited BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS tied_status_inherited BOOLEAN DEFAULT FALSE;
      `
    })

    if (error) {
      console.error('[Migration] Error:', error)
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      )
    }

    console.log('[Migration] Columns added successfully')

    return NextResponse.json({
      success: true,
      message: 'Inherited flag columns added successfully'
    })
  } catch (error: any) {
    console.error('[Migration] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
