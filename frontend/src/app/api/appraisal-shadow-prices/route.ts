import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { data, error } = await supabase!
    .from('appraisal_shadow_prices')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return the first active row, or defaults
  const shadowPrices = data?.[0] || {
    shadow_wage_rate: 0.6,
    shadow_exchange_rate: 1.2,
    standard_conversion_factor: 0.9,
    social_discount_rate: 6.0,
  };

  return NextResponse.json(shadowPrices);
}
