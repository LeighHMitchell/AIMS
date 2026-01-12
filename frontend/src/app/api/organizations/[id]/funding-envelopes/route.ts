import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { convertTransactionToUSD } from '@/lib/transaction-usd-helper';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Helper function to convert funding envelope amount to USD
 * Uses the same pattern as transactions for consistency
 */
async function convertEnvelopeToUSD(
  amount: number,
  currency: string,
  valueDate: string | null,
  yearStart: number
): Promise<{
  amount_usd: number | null;
  exchange_rate_used: number | null;
  usd_conversion_date: string | null;
  usd_convertible: boolean;
}> {
  // If already USD, no conversion needed
  if (currency === 'USD') {
    return {
      amount_usd: amount,
      exchange_rate_used: 1.0,
      usd_conversion_date: new Date().toISOString(),
      usd_convertible: true
    };
  }

  // Determine the date to use for conversion
  // Priority: value_date > Jan 1 of year_start
  const conversionDate = valueDate
    ? new Date(valueDate)
    : new Date(yearStart, 0, 1); // Jan 1 of the year_start

  try {
    const result = await convertTransactionToUSD(amount, currency, conversionDate);

    if (result.success) {
      return {
        amount_usd: result.value_usd,
        exchange_rate_used: result.exchange_rate_used,
        usd_conversion_date: result.usd_conversion_date,
        usd_convertible: true
      };
    } else {
      console.warn(`[Funding Envelopes API] USD conversion failed: ${result.error}`);
      return {
        amount_usd: null,
        exchange_rate_used: null,
        usd_conversion_date: new Date().toISOString(),
        usd_convertible: false
      };
    }
  } catch (error) {
    console.error('[Funding Envelopes API] USD conversion error:', error);
    return {
      amount_usd: null,
      exchange_rate_used: null,
      usd_conversion_date: new Date().toISOString(),
      usd_convertible: false
    };
  }
}

// GET - Fetch all funding envelopes for an organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('organization_funding_envelopes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('year_start', { ascending: false })
      .order('year_end', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('[Funding Envelopes API] Error fetching envelopes:', error);
      return NextResponse.json({ error: 'Failed to fetch funding envelopes' }, { status: 500 });
    }

    // Convert funding_type_flags array from database format
    const envelopes = (data || []).map((envelope: any) => ({
      ...envelope,
      funding_type_flags: envelope.funding_type_flags || []
    }));

    return NextResponse.json(envelopes);
  } catch (error) {
    console.error('[Funding Envelopes API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new funding envelope
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id: organizationId } = await params;
    const body = await request.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Validation
    if (!body.amount || !body.currency || !body.year_start || !body.flow_direction || !body.organization_role || !body.status) {
      return NextResponse.json({ 
        error: 'Missing required fields: amount, currency, year_start, flow_direction, organization_role, and status are required' 
      }, { status: 400 });
    }

    // Validate period_type
    if (body.period_type === 'multi_year' && (!body.year_end || body.year_end < body.year_start)) {
      return NextResponse.json({ 
        error: 'For multi_year period_type, year_end must be provided and >= year_start' 
      }, { status: 400 });
    }

    if (body.period_type === 'single_year') {
      body.year_end = null;
    }

    // Ensure funding_type_flags is an array
    const fundingTypeFlags = Array.isArray(body.funding_type_flags) ? body.funding_type_flags : [];

    // Normalize value_date (empty string to null)
    const normalizedValueDate = body.value_date && body.value_date.trim() !== ''
      ? body.value_date
      : null;

    // Convert to USD
    console.log(`[Funding Envelopes API] Converting to USD: ${body.amount} ${body.currency}`);
    const usdConversion = await convertEnvelopeToUSD(
      body.amount,
      body.currency,
      normalizedValueDate,
      body.year_start
    );

    if (usdConversion.amount_usd !== null) {
      console.log(`[Funding Envelopes API] USD conversion successful: ${body.amount} ${body.currency} = $${usdConversion.amount_usd} USD`);
    } else {
      console.warn(`[Funding Envelopes API] USD conversion failed for ${body.currency}`);
    }

    const { data, error } = await supabase
      .from('organization_funding_envelopes')
      .insert({
        organization_id: organizationId,
        period_type: body.period_type,
        year_type: body.year_type || 'calendar',
        year_start: body.year_start,
        year_end: body.year_end || null,
        fiscal_year_start_month: body.fiscal_year_start_month || null,
        amount: body.amount,
        currency: body.currency,
        value_date: normalizedValueDate,
        amount_usd: usdConversion.amount_usd,
        exchange_rate_used: usdConversion.exchange_rate_used,
        usd_conversion_date: usdConversion.usd_conversion_date,
        usd_convertible: usdConversion.usd_convertible,
        flow_direction: body.flow_direction,
        organization_role: body.organization_role,
        funding_type_flags: fundingTypeFlags,
        status: body.status,
        confidence_level: body.confidence_level || null,
        notes: body.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[Funding Envelopes API] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create funding envelope', details: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Funding Envelopes API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a funding envelope
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Envelope ID required' }, { status: 400 });
    }

    // Validate period_type if provided
    if (body.period_type === 'multi_year' && (!body.year_end || body.year_end < body.year_start)) {
      return NextResponse.json({ 
        error: 'For multi_year period_type, year_end must be provided and >= year_start' 
      }, { status: 400 });
    }

    if (body.period_type === 'single_year') {
      body.year_end = null;
    }

    // Ensure funding_type_flags is an array
    if (body.funding_type_flags !== undefined) {
      body.funding_type_flags = Array.isArray(body.funding_type_flags) ? body.funding_type_flags : [];
    }

    // Normalize value_date (empty string to null)
    const normalizedValueDate = body.value_date && body.value_date.trim() !== ''
      ? body.value_date
      : null;

    // Convert to USD (re-convert on update in case amount, currency, or value_date changed)
    console.log(`[Funding Envelopes API] Converting to USD (update): ${body.amount} ${body.currency}`);
    const usdConversion = await convertEnvelopeToUSD(
      body.amount,
      body.currency,
      normalizedValueDate,
      body.year_start
    );

    if (usdConversion.amount_usd !== null) {
      console.log(`[Funding Envelopes API] USD conversion successful: ${body.amount} ${body.currency} = $${usdConversion.amount_usd} USD`);
    } else {
      console.warn(`[Funding Envelopes API] USD conversion failed for ${body.currency}`);
    }

    const { data, error } = await supabase
      .from('organization_funding_envelopes')
      .update({
        period_type: body.period_type,
        year_type: body.year_type || 'calendar',
        year_start: body.year_start,
        year_end: body.year_end !== undefined ? body.year_end : null,
        fiscal_year_start_month: body.fiscal_year_start_month || null,
        amount: body.amount,
        currency: body.currency,
        value_date: normalizedValueDate,
        amount_usd: usdConversion.amount_usd,
        exchange_rate_used: usdConversion.exchange_rate_used,
        usd_conversion_date: usdConversion.usd_conversion_date,
        usd_convertible: usdConversion.usd_convertible,
        flow_direction: body.flow_direction,
        organization_role: body.organization_role,
        funding_type_flags: body.funding_type_flags,
        status: body.status,
        confidence_level: body.confidence_level !== undefined ? body.confidence_level : null,
        notes: body.notes !== undefined ? body.notes : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('[Funding Envelopes API] Update error:', error);
      return NextResponse.json({ error: 'Failed to update funding envelope', details: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Funding Envelopes API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a funding envelope
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const envelopeId = searchParams.get('envelopeId');

    if (!envelopeId) {
      return NextResponse.json({ error: 'Envelope ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('organization_funding_envelopes')
      .delete()
      .eq('id', envelopeId);

    if (error) {
      console.error('[Funding Envelopes API] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete funding envelope', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Funding Envelopes API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



