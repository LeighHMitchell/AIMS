import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['sdg', 'sector', 'location'] as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth()
  if (authResponse) return authResponse

  const { type } = await params

  if (!VALID_TYPES.includes(type as any)) {
    return NextResponse.json({ error: 'Invalid profile type' }, { status: 400 })
  }

  const { data, error } = await supabase!
    .from('profile_banners')
    .select('profile_id, banner, banner_position')
    .eq('profile_type', type)
    .not('banner', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return as a map: { [profile_id]: { banner, banner_position } }
  const bannerMap: Record<string, { banner: string; banner_position: number }> = {}
  if (data) {
    data.forEach((row: any) => {
      if (row.banner) {
        bannerMap[row.profile_id] = { banner: row.banner, banner_position: row.banner_position }
      }
    })
  }

  return NextResponse.json(bannerMap)
}
