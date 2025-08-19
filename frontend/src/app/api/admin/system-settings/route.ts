import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import fs from 'fs/promises'
import path from 'path'

// Path to the system settings JSON file
const SETTINGS_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'system-settings.json')

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    
    // Try to get from database first if available
    if (supabase) {
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('*')
        .single()

      if (!error && settings) {
        return NextResponse.json({
          homeCountry: settings.home_country || 'RW'
        })
      }
      
      // Log database error but continue to file fallback
      if (error) {
        console.log('Database not available, using file storage:', error.message)
      }
    }
    
    // Fallback to file-based storage
    try {
      const fileContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8')
      const settings = JSON.parse(fileContent)
      return NextResponse.json({
        homeCountry: settings.homeCountry || 'RW'
      })
    } catch (fileError) {
      console.log('Settings file not found, returning defaults')
      // Return default if file doesn't exist
      return NextResponse.json({
        homeCountry: 'RW'
      })
    }
  } catch (error) {
    console.error('Error in GET /api/admin/system-settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { homeCountry } = body

    if (!homeCountry) {
      return NextResponse.json(
        { error: 'Home country is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    
    // Try to save to database first if available
    if (supabase) {
      const { data, error } = await supabase
        .from('system_settings')
        .upsert({
          id: 1, // Single row for system settings
          home_country: homeCountry,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (!error && data) {
        console.log('Successfully updated system settings in database:', data)
        return NextResponse.json({
          success: true,
          homeCountry: data.home_country
        })
      }
      
      // Log database error but continue to file fallback
      if (error) {
        console.log('Database not available, using file storage:', error.message)
      }
    }

    // Fallback to file-based storage
    try {
      const settings = { homeCountry }
      await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2))
      console.log('Successfully saved system settings to file:', settings)
      
      return NextResponse.json({
        success: true,
        homeCountry: homeCountry
      })
    } catch (fileError) {
      console.error('Error saving to file:', fileError)
      return NextResponse.json(
        { error: 'Failed to save settings', details: 'Could not save to file system' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in POST /api/admin/system-settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
