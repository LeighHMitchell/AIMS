import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

// POST - Create a new forecast
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    console.log('[Forecasts API] POST request:', body);

    // Validate required fields
    if (!body.fss_id) {
      return NextResponse.json({ error: 'FSS ID is required' }, { status: 400 });
    }
    if (!body.forecast_year) {
      return NextResponse.json({ error: 'Forecast year is required' }, { status: 400 });
    }
    if (body.amount === undefined || body.amount === null) {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }
    if (!body.currency) {
      return NextResponse.json({ error: 'Currency is required' }, { status: 400 });
    }

    // Validate year
    const year = parseInt(body.forecast_year);
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid forecast year' }, { status: 400 });
    }

    // Validate amount
    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount < 0) {
      return NextResponse.json({ error: 'Amount must be a non-negative number' }, { status: 400 });
    }

    // Convert to USD if not already USD
    let usdAmount = null;
    if (body.currency !== 'USD' && body.value_date) {
      try {
        const result = await fixedCurrencyConverter.convertToUSD(
          amount,
          body.currency,
          new Date(body.value_date)
        );
        usdAmount = result.usd_amount;
        console.log('[Forecasts API] Converted', amount, body.currency, 'to', usdAmount, 'USD');
      } catch (conversionError) {
        console.error('[Forecasts API] Currency conversion failed:', conversionError);
        // Continue without USD conversion
      }
    } else if (body.currency === 'USD') {
      usdAmount = amount;
    }

    // Insert forecast
    const { data: forecast, error: forecastError } = await supabase
      .from('fss_forecasts')
      .insert({
        fss_id: body.fss_id,
        forecast_year: year,
        amount: amount,
        currency: body.currency,
        value_date: body.value_date || null,
        usd_amount: usdAmount,
        notes: body.notes || null
      })
      .select()
      .single();

    if (forecastError) {
      console.error('[Forecasts API] Error inserting forecast:', forecastError);
      return NextResponse.json({ 
        error: 'Failed to create forecast', 
        details: forecastError.message 
      }, { status: 500 });
    }

    console.log('[Forecasts API] Successfully created forecast:', forecast.id);
    return NextResponse.json(forecast);
  } catch (error) {
    console.error('[Forecasts API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update an existing forecast
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    console.log('[Forecasts API] PUT request:', body);

    if (!body.id) {
      return NextResponse.json({ error: 'Forecast ID is required' }, { status: 400 });
    }

    // Validate year if provided
    if (body.forecast_year) {
      const year = parseInt(body.forecast_year);
      if (isNaN(year) || year < 2000 || year > 2100) {
        return NextResponse.json({ error: 'Invalid forecast year' }, { status: 400 });
      }
    }

    // Validate amount if provided
    if (body.amount !== undefined) {
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount < 0) {
        return NextResponse.json({ error: 'Amount must be a non-negative number' }, { status: 400 });
      }
    }

    // Convert to USD if currency and value_date are provided
    let usdAmount = body.usd_amount;
    if (body.amount !== undefined && body.currency && body.currency !== 'USD' && body.value_date) {
      try {
        const result = await fixedCurrencyConverter.convertToUSD(
          parseFloat(body.amount),
          body.currency,
          new Date(body.value_date)
        );
        usdAmount = result.usd_amount;
        console.log('[Forecasts API] Converted', body.amount, body.currency, 'to', usdAmount, 'USD');
      } catch (conversionError) {
        console.error('[Forecasts API] Currency conversion failed:', conversionError);
      }
    } else if (body.currency === 'USD' && body.amount !== undefined) {
      usdAmount = parseFloat(body.amount);
    }

    // Update forecast
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (body.forecast_year !== undefined) updateData.forecast_year = parseInt(body.forecast_year);
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.value_date !== undefined) updateData.value_date = body.value_date;
    if (usdAmount !== undefined) updateData.usd_amount = usdAmount;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const { data: forecast, error: forecastError } = await supabase
      .from('fss_forecasts')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();

    if (forecastError) {
      console.error('[Forecasts API] Error updating forecast:', forecastError);
      return NextResponse.json({ 
        error: 'Failed to update forecast', 
        details: forecastError.message 
      }, { status: 500 });
    }

    console.log('[Forecasts API] Successfully updated forecast:', forecast.id);
    return NextResponse.json(forecast);
  } catch (error) {
    console.error('[Forecasts API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a forecast
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const forecastId = searchParams.get('id');

    console.log('[Forecasts API] DELETE request for forecastId:', forecastId);

    if (!forecastId) {
      return NextResponse.json({ error: 'Forecast ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('fss_forecasts')
      .delete()
      .eq('id', forecastId);

    if (error) {
      console.error('[Forecasts API] Error deleting forecast:', error);
      return NextResponse.json({ error: 'Failed to delete forecast' }, { status: 500 });
    }

    console.log('[Forecasts API] Successfully deleted forecast');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Forecasts API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

