import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { convertTransactionToUSD } from '@/lib/transaction-usd-helper';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Postgres raises 42501 (insufficient_privilege) when an RLS WITH CHECK / USING
// clause blocks a write. Used to return a clean 403 instead of a generic 500.
function isRlsViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === '42501';
}

/**
 * Validate an IATI budget period (period-start / period-end) and derive the
 * legacy year fields kept in sync for analytics. The period must be valid,
 * ordered, and not exceed one year (IATI rule).
 */
function derivePeriod(
  periodStart: string,
  periodEnd: string
): { period_start: string; period_end: string; year_start: number; year_end: number | null } | { error: string } {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { error: 'period_start and period_end must be valid dates' };
  }
  if (end < start) {
    return { error: 'period_end must be on or after period_start' };
  }
  const oneYearMs = 366 * 24 * 60 * 60 * 1000; // allow a full leap year
  if (end.getTime() - start.getTime() > oneYearMs) {
    return { error: 'Budget period must not exceed one year (IATI rule)' };
  }
  const yearStart = start.getUTCFullYear();
  const yearEnd = end.getUTCFullYear();
  return {
    period_start: periodStart,
    period_end: periodEnd,
    year_start: yearStart,
    year_end: yearEnd !== yearStart ? yearEnd : null,
  };
}

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

/**
 * Resolve the USD conversion for an envelope.
 *
 * Honours a client-supplied exchange rate (the rate shown/typed in the modal,
 * whether auto-fetched or manually entered) so the saved value matches what the
 * user previewed. Falls back to a server-side conversion when no usable rate is
 * provided. USD amounts always equal `amount * rate` (same convention as
 * currency-converter-fixed.ts).
 */
async function resolveEnvelopeUsd(
  amount: number,
  currency: string,
  valueDate: string | null,
  yearStart: number,
  clientRate: unknown
): Promise<{
  amount_usd: number | null;
  exchange_rate_used: number | null;
  usd_conversion_date: string | null;
  usd_convertible: boolean;
}> {
  const manualRate = typeof clientRate === 'number' ? clientRate : Number(clientRate);

  // Honour an explicit, valid rate for non-USD currencies.
  if (currency !== 'USD' && Number.isFinite(manualRate) && manualRate > 0) {
    return {
      amount_usd: Math.round(amount * manualRate * 100) / 100,
      exchange_rate_used: manualRate,
      usd_conversion_date: new Date().toISOString(),
      usd_convertible: true
    };
  }

  // Otherwise convert server-side (also handles USD → rate 1.0).
  return convertEnvelopeToUSD(amount, currency, valueDate, yearStart);
}

// GET - Fetch all funding envelopes for an organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
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
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id: organizationId } = await params;
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Validation — IATI recipient-country-budget: amount, currency, period, status.
    if (!body.amount || !body.currency || !body.period_start || !body.period_end || !body.status) {
      return NextResponse.json({
        error: 'Missing required fields: amount, currency, period_start, period_end, and status are required'
      }, { status: 400 });
    }

    if (!['indicative', 'committed'].includes(body.status)) {
      return NextResponse.json({
        error: "status must be 'indicative' or 'committed'"
      }, { status: 400 });
    }

    const period = derivePeriod(body.period_start, body.period_end);
    if ('error' in period) {
      return NextResponse.json({ error: period.error }, { status: 400 });
    }

    // Normalize value_date (empty string to null)
    const normalizedValueDate = body.value_date && body.value_date.trim() !== ''
      ? body.value_date
      : null;

    // Convert to USD (honours a client-supplied rate when provided). Falls back
    // to the period start date when no explicit value date is given.
    const usdConversion = await resolveEnvelopeUsd(
      body.amount,
      body.currency,
      normalizedValueDate || period.period_start,
      period.year_start,
      body.exchange_rate_used
    );

    if (usdConversion.amount_usd === null) {
      console.warn(`[Funding Envelopes API] USD conversion failed for ${body.currency}`);
    }

    const { data, error } = await supabase
      .from('organization_funding_envelopes')
      .insert({
        organization_id: organizationId,
        period_type: 'single_year',
        year_type: 'calendar',
        recipient_country: body.recipient_country || null,
        period_start: period.period_start,
        period_end: period.period_end,
        year_start: period.year_start,
        year_end: period.year_end,
        amount: body.amount,
        currency: body.currency,
        value_date: normalizedValueDate,
        amount_usd: usdConversion.amount_usd,
        exchange_rate_used: usdConversion.exchange_rate_used,
        usd_conversion_date: usdConversion.usd_conversion_date,
        usd_convertible: usdConversion.usd_convertible,
        status: body.status,
        notes: body.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[Funding Envelopes API] Insert error:', error);
      if (isRlsViolation(error)) {
        return NextResponse.json({ error: 'You do not have permission to add funding envelopes for this organisation' }, { status: 403 });
      }
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
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    if (!body.id) {
      return NextResponse.json({ error: 'Envelope ID required' }, { status: 400 });
    }

    if (body.status && !['indicative', 'committed'].includes(body.status)) {
      return NextResponse.json({
        error: "status must be 'indicative' or 'committed'"
      }, { status: 400 });
    }

    if (!body.period_start || !body.period_end) {
      return NextResponse.json({
        error: 'Missing required fields: period_start and period_end are required'
      }, { status: 400 });
    }

    const period = derivePeriod(body.period_start, body.period_end);
    if ('error' in period) {
      return NextResponse.json({ error: period.error }, { status: 400 });
    }

    // Normalize value_date (empty string to null)
    const normalizedValueDate = body.value_date && body.value_date.trim() !== ''
      ? body.value_date
      : null;

    // Re-convert on update in case amount, currency, value_date, or rate changed
    // (honours a client-supplied rate when provided)
    const usdConversion = await resolveEnvelopeUsd(
      body.amount,
      body.currency,
      normalizedValueDate || period.period_start,
      period.year_start,
      body.exchange_rate_used
    );

    if (usdConversion.amount_usd === null) {
      console.warn(`[Funding Envelopes API] USD conversion failed for ${body.currency}`);
    }

    const { data, error } = await supabase
      .from('organization_funding_envelopes')
      .update({
        period_type: 'single_year',
        year_type: 'calendar',
        recipient_country: body.recipient_country || null,
        period_start: period.period_start,
        period_end: period.period_end,
        year_start: period.year_start,
        year_end: period.year_end,
        amount: body.amount,
        currency: body.currency,
        value_date: normalizedValueDate,
        amount_usd: usdConversion.amount_usd,
        exchange_rate_used: usdConversion.exchange_rate_used,
        usd_conversion_date: usdConversion.usd_conversion_date,
        usd_convertible: usdConversion.usd_convertible,
        status: body.status,
        notes: body.notes !== undefined ? body.notes : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('[Funding Envelopes API] Update error:', error);
      if (isRlsViolation(error)) {
        return NextResponse.json({ error: 'You do not have permission to edit this funding envelope' }, { status: 403 });
      }
      // .single() returns PGRST116 when no row is visible/updatable — either the
      // id doesn't exist or RLS hides it from this user.
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Funding envelope not found, or you do not have permission to edit it' }, { status: 404 });
      }
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
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(request.url);
    const envelopeId = searchParams.get('envelopeId');

    if (!envelopeId) {
      return NextResponse.json({ error: 'Envelope ID required' }, { status: 400 });
    }

    // Select the deleted rows so we can tell a real delete from a no-op (an
    // RLS-blocked delete affects 0 rows but does NOT raise an error).
    const { data: deleted, error } = await supabase
      .from('organization_funding_envelopes')
      .delete()
      .eq('id', envelopeId)
      .select('id');

    if (error) {
      console.error('[Funding Envelopes API] Delete error:', error);
      if (isRlsViolation(error)) {
        return NextResponse.json({ error: 'You do not have permission to delete this funding envelope' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Failed to delete funding envelope', details: error.message }, { status: 500 });
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'Funding envelope not found, or you do not have permission to delete it' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Funding Envelopes API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



