import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    console.log('[Test DB] Testing database connection...')
    
    // Check environment variables
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing',
      SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing',
    }
    
    console.log('[Test DB] Environment check:', envCheck)
    
    const supabase = getSupabaseAdmin()
    
    if (!supabase) {
      console.error('[Test DB] Failed to create Supabase admin client')
      return NextResponse.json({
        success: false,
        error: 'Failed to create Supabase admin client',
        envCheck
      }, { status: 500 })
    }
    
    console.log('[Test DB] Supabase client created successfully')
    
    // Test basic connection
    const { data: version, error: versionError } = await supabase
      .rpc('version')
    
    if (versionError) {
      console.log('[Test DB] Version check failed (this is normal):', versionError.message)
    } else {
      console.log('[Test DB] Database version:', version)
    }
    
    // Test if system_settings table exists
    const { data: tableExists, error: tableCheckError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'system_settings')
      .eq('table_schema', 'public')
      .single()
    
    if (tableCheckError) {
      console.log('[Test DB] Table check failed:', tableCheckError.message)
    }
    
    if (!tableExists) {
      console.log('[Test DB] system_settings table does not exist yet')
      return NextResponse.json({
        success: false,
        error: 'system_settings table does not exist',
        message: 'You need to run the migration to create the system_settings table first',
        envCheck,
        nextSteps: [
          'Run the migration: 20250129000010_create_simple_system_settings.sql',
          'This will create the basic table structure needed for system settings'
        ]
      }, { status: 404 })
    }
    
    console.log('[Test DB] system_settings table exists')
    
    // Test system_settings table access
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
    
    if (settingsError) {
      console.error('[Test DB] System settings access failed:', settingsError)
      return NextResponse.json({
        success: false,
        error: 'Failed to access system_settings table',
        details: settingsError.message,
        envCheck
      }, { status: 500 })
    }
    
    console.log('[Test DB] System settings access successful:', settings)
    
    // Test insert/update capability
    const testData = {
      id: 1,
      home_country: 'RW',
      updated_at: new Date().toISOString()
    }
    
    const { data: upsertData, error: upsertError } = await supabase
      .from('system_settings')
      .upsert(testData)
      .select()
      .single()
    
    if (upsertError) {
      console.error('[Test DB] Upsert test failed:', upsertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to upsert to system_settings table',
        details: upsertError.message,
        envCheck
      }, { status: 500 })
    }
    
    console.log('[Test DB] Upsert test successful:', upsertData)
    
    return NextResponse.json({
      success: true,
      message: 'Database connection test successful',
      envCheck,
      tableExists: true,
      settings: settings,
      upsertTest: upsertData
    })
    
  } catch (error) {
    console.error('[Test DB] Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error during database test',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
