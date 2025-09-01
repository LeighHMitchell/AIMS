import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    // Debug logging for production troubleshooting
    console.log('[System Settings] GET request received')
    console.log('[System Settings] Environment check:')
    console.log('- NODE_ENV:', process.env.NODE_ENV)
    console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing')
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing')
    
    const supabase = getSupabaseAdmin()
    
    if (!supabase) {
      console.error('[System Settings] Supabase admin client not available')
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    console.log('[System Settings] Supabase client created successfully')
    
    // Check if the table exists first
    const { data: tableExists, error: tableCheckError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'system_settings')
      .eq('table_schema', 'public')
      .single()
    
    if (tableCheckError) {
      console.log('[System Settings] Table check failed:', tableCheckError.message)
    }
    
    if (!tableExists) {
      console.log('[System Settings] system_settings table does not exist yet')
      return NextResponse.json(
        { 
          error: 'System settings table not found',
          message: 'The system_settings table has not been created yet. Please run the database migration first.',
          nextSteps: [
            'Run the migration: 20250129000010_create_simple_system_settings.sql',
            'This will create the basic table structure needed for system settings'
          ]
        },
        { status: 404 }
      )
    }
    
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .single()

    if (error) {
      console.error('[System Settings] Error fetching from database:', error)
      return NextResponse.json(
        { error: 'Failed to fetch system settings from database', details: error.message },
        { status: 500 }
      )
    }

    if (!settings) {
      console.log('[System Settings] No settings found, returning defaults')
      return NextResponse.json({
        homeCountry: 'RW'
      })
    }

    console.log('[System Settings] Successfully fetched settings:', settings)
    return NextResponse.json({
      homeCountry: settings.home_country || 'RW'
    })
  } catch (error) {
    console.error('[System Settings] Unexpected error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[System Settings] POST request received')
    
    const body = await request.json()
    const { homeCountry } = body

    if (!homeCountry) {
      return NextResponse.json(
        { error: 'Home country is required' },
        { status: 400 }
      )
    }

    console.log('[System Settings] Attempting to save home country:', homeCountry)
    
    const supabase = getSupabaseAdmin()
    
    if (!supabase) {
      console.error('[System Settings] Supabase admin client not available')
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Check if the table exists first
    const { data: tableExists, error: tableCheckError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'system_settings')
      .eq('table_schema', 'public')
      .single()
    
    if (tableCheckError) {
      console.log('[System Settings] Table check failed:', tableCheckError.message)
    }
    
    if (!tableExists) {
      console.log('[System Settings] system_settings table does not exist yet')
      return NextResponse.json(
        { 
          error: 'System settings table not found',
          message: 'The system_settings table has not been created yet. Please run the database migration first.',
          nextSteps: [
            'Run the migration: 20250129000010_create_simple_system_settings.sql',
            'This will create the basic table structure needed for system settings'
          ]
        },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        id: 1, // Single row for system settings
        home_country: homeCountry,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('[System Settings] Error saving to database:', error)
      return NextResponse.json(
        { error: 'Failed to save settings to database', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to save settings - no data returned' },
        { status: 500 }
      )
    }

    console.log('[System Settings] Successfully updated settings in database:', data)
    return NextResponse.json({
      success: true,
      homeCountry: data.home_country
    })
  } catch (error) {
    console.error('[System Settings] Unexpected error in POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
