import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  console.log('[API] GET /api/sectors/by-year - Starting request')
  
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const donor = searchParams.get('donor')
  const donorGroup = searchParams.get('donorGroup')
  const donorType = searchParams.get('donorType')
  const partnerClass = searchParams.get('partnerClass')

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // For now, return sample data
    // In production, this would query the database based on filters
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i)
    
    const sectors = [
      'Health',
      'Education', 
      'Agriculture',
      'Infrastructure',
      'Governance',
      'Water & Sanitation',
      'Energy',
      'Social Protection'
    ]

    // Generate sample data with some randomness
    const timeSeriesData = years.map(year => {
      const sectorData: { [key: string]: number } = {}
      let total = 0
      
      sectors.forEach(sector => {
        // Generate values with some growth trend
        const baseValue = Math.floor(Math.random() * 2000000) + 500000
        const growthFactor = 1 + ((year - years[0]) * 0.1)
        const value = Math.floor(baseValue * growthFactor)
        
        sectorData[sector] = value
        total += value
      })

      return {
        year,
        sectors: sectorData,
        total
      }
    })

    console.log('[API] Successfully generated sector time series data')
    return NextResponse.json(timeSeriesData)
    
  } catch (error) {
    console.error('[API] Error fetching sector data:', error)
    
    // Return the sample data from the component if there's an error
    const sampleData = [
      {
        year: 2020,
        sectors: {
          'Health': 1500000,
          'Education': 2000000,
          'Agriculture': 1200000,
          'Infrastructure': 1800000,
          'Governance': 800000
        },
        total: 7300000
      },
      {
        year: 2021,
        sectors: {
          'Health': 1800000,
          'Education': 2200000,
          'Agriculture': 1100000,
          'Infrastructure': 2100000,
          'Governance': 900000
        },
        total: 8100000
      },
      {
        year: 2022,
        sectors: {
          'Health': 2000000,
          'Education': 2500000,
          'Agriculture': 1300000,
          'Infrastructure': 2300000,
          'Governance': 1000000
        },
        total: 9100000
      },
      {
        year: 2023,
        sectors: {
          'Health': 2200000,
          'Education': 2800000,
          'Agriculture': 1400000,
          'Infrastructure': 2500000,
          'Governance': 1100000
        },
        total: 10000000
      },
      {
        year: 2024,
        sectors: {
          'Health': 2500000,
          'Education': 3200000,
          'Agriculture': 1600000,
          'Infrastructure': 2800000,
          'Governance': 1200000
        },
        total: 11300000
      }
    ]
    
    return NextResponse.json(sampleData)
  }
} 