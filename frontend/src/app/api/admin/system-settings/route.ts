import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    console.log('[System Settings] GET request received')
    
    const supabase = getSupabaseAdmin()
    
    if (!supabase) {
      console.error('[System Settings] Supabase admin client not available')
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    console.log('[System Settings] Supabase client created successfully')
    
    // Try to create the table if it doesn't exist
    try {
      const { error: createTableError } = await supabase.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS system_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            home_country VARCHAR(2) NOT NULL DEFAULT 'RW',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          INSERT INTO system_settings (id, home_country) 
          VALUES (1, 'RW')
          ON CONFLICT (id) DO NOTHING;
        `
      })
      
      if (createTableError) {
        console.log('[System Settings] Could not create table via RPC, trying direct approach')
      }
    } catch (rpcError) {
      console.log('[System Settings] RPC approach failed, continuing with direct query')
    }
    
    // Try to fetch settings, and if table doesn't exist, return defaults
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .single()

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "system_settings" does not exist')) {
        console.log('[System Settings] Table does not exist, returning defaults')
        return NextResponse.json({
          homeCountry: 'RW'
        })
      }
      
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
      { homeCountry: 'RW' }, // Return defaults on any error
      { status: 200 }
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

    // Try to create the table if it doesn't exist
    try {
      const { error: createTableError } = await supabase.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS system_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            home_country VARCHAR(2) NOT NULL DEFAULT 'RW',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      })
      
      if (createTableError) {
        console.log('[System Settings] Could not create table via RPC')
      }
    } catch (rpcError) {
      console.log('[System Settings] RPC approach failed for POST')
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
