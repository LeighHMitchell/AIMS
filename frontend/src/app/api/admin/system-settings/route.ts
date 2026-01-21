import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    console.log('[System Settings] GET request received')
    if (!supabase) {
      console.error('[System Settings] Supabase admin client not available')
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    console.log('[System Settings] Supabase client created successfully')

    // Try to fetch settings, and if table doesn't exist, return defaults
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .single()

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "system_settings" does not exist')) {
        console.log('[System Settings] Table does not exist, returning defaults')
        return NextResponse.json({
          homeCountry: 'RW',
          defaultLanguage: 'en',
          defaultCurrency: 'USD'
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
        homeCountry: 'RW',
        defaultLanguage: 'en',
        defaultCurrency: 'USD'
      })
    }

    console.log('[System Settings] Successfully fetched settings:', settings)
    // Handle case where new columns might not exist yet
    return NextResponse.json({
      homeCountry: settings.home_country || 'RW',
      defaultLanguage: settings.default_language || 'en',
      defaultCurrency: settings.default_currency || 'USD'
    })
  } catch (error) {
    console.error('[System Settings] Unexpected error in GET:', error)
    return NextResponse.json(
      { homeCountry: 'RW', defaultLanguage: 'en', defaultCurrency: 'USD' }, // Return defaults on any error
      { status: 200 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    console.log('[System Settings] POST request received')

    const body = await request.json()
    const { homeCountry, defaultLanguage, defaultCurrency } = body

    if (!homeCountry) {
      return NextResponse.json(
        { error: 'Home country is required' },
        { status: 400 }
      )
    }

    console.log('[System Settings] Attempting to save settings:', { homeCountry, defaultLanguage, defaultCurrency })
    if (!supabase) {
      console.error('[System Settings] Supabase admin client not available')
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // First, try to update with all columns (including new ones)
    // If that fails due to missing columns, fall back to just home_country
    let data, error

    try {
      const result = await supabase
        .from('system_settings')
        .upsert({
          id: 1,
          home_country: homeCountry,
          default_language: defaultLanguage || 'en',
          default_currency: defaultCurrency || 'USD',
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      data = result.data
      error = result.error
    } catch (e) {
      console.log('[System Settings] Full update failed, trying home_country only')
      // If the new columns don't exist yet, just update home_country
      const result = await supabase
        .from('system_settings')
        .upsert({
          id: 1,
          home_country: homeCountry,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      data = result.data
      error = result.error
    }

    if (error) {
      // Check if it's a column-not-found error and try fallback
      if (error.message?.includes('default_language') || error.message?.includes('default_currency')) {
        console.log('[System Settings] New columns not found, updating home_country only')
        const fallbackResult = await supabase
          .from('system_settings')
          .upsert({
            id: 1,
            home_country: homeCountry,
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (fallbackResult.error) {
          console.error('[System Settings] Fallback update also failed:', fallbackResult.error)
          return NextResponse.json(
            { error: 'Failed to save settings to database', details: fallbackResult.error.message },
            { status: 500 }
          )
        }

        console.log('[System Settings] Successfully updated home_country (new columns not available yet)')
        return NextResponse.json({
          success: true,
          homeCountry: fallbackResult.data.home_country,
          defaultLanguage: defaultLanguage || 'en',
          defaultCurrency: defaultCurrency || 'USD'
        })
      }

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
      homeCountry: data.home_country,
      defaultLanguage: data.default_language || defaultLanguage || 'en',
      defaultCurrency: data.default_currency || defaultCurrency || 'USD'
    })
  } catch (error) {
    console.error('[System Settings] Unexpected error in POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
