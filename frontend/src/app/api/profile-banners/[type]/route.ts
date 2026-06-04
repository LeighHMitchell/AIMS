import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['sdg', 'sector', 'location', 'policy_marker'] as const

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

  // Pull banner + customization overrides for every profile of this type.
  const first = await supabase!
    .from('profile_banners')
    .select('profile_id, banner, banner_position, description, color, icon')
    .eq('profile_type', type)

  let data: any[] | null = first.data
  let error = first.error

  // Tolerate the description/color/icon migration not being run yet
  if (error && /(description|color|icon)/i.test(error.message) && /(does not exist|schema cache)/i.test(error.message)) {
    const fb = await supabase!
      .from('profile_banners')
      .select('profile_id, banner, banner_position')
      .eq('profile_type', type)
      .not('banner', 'is', null)
    data = fb.data
    error = fb.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return as a map: { [profile_id]: { banner, banner_position, description, color, icon } }
  const map: Record<string, any> = {}
  if (data) {
    data.forEach((row: any) => {
      if (row.banner || row.description || row.color || row.icon) {
        map[row.profile_id] = {
          banner: row.banner ?? null,
          banner_position: row.banner_position ?? 50,
          description: row.description ?? null,
          color: row.color ?? null,
          icon: row.icon ?? null,
        }
      }
    })
  }

  return NextResponse.json(map)
}
