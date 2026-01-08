import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id: activityId } = await params;
    const body = await request.json();

    console.log('[FSS Import API] POST request for activityId:', activityId);

    if (!body.fssData) {
      return NextResponse.json({ error: 'FSS data is required' }, { status: 400 });
    }

    const { fssData } = body;

    // Validate extraction date
    if (!fssData.extractionDate) {
      return NextResponse.json({ error: 'Extraction date is required' }, { status: 400 });
    }

    // Upsert FSS record
    const { data: fss, error: fssError } = await supabase
      .from('forward_spending_survey')
      .upsert({
        activity_id: activityId,
        extraction_date: fssData.extractionDate,
        priority: fssData.priority || null,
        phaseout_year: fssData.phaseoutYear || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'activity_id' })
      .select()
      .single();

    if (fssError) {
      console.error('[FSS Import API] Error upserting FSS:', fssError);
      return NextResponse.json({ 
        error: 'Failed to import FSS', 
        details: fssError.message 
      }, { status: 500 });
    }

    console.log('[FSS Import API] FSS created/updated:', fss.id);

    // Process forecasts
    let importedForecasts = 0;
    const errors: string[] = [];

    if (fssData.forecasts && Array.isArray(fssData.forecasts)) {
      for (const forecast of fssData.forecasts) {
        try {
          // Validate forecast data
          if (!forecast.year) {
            errors.push(`Forecast missing year`);
            continue;
          }
          if (!forecast.value && forecast.value !== 0) {
            errors.push(`Forecast ${forecast.year}: missing value`);
            continue;
          }
          if (!forecast.currency) {
            errors.push(`Forecast ${forecast.year}: missing currency`);
            continue;
          }

          // Convert to USD if needed
          let usdAmount = null;
          if (forecast.currency !== 'USD' && forecast.valueDate) {
            try {
              usdAmount = await fixedCurrencyConverter.convert(
                forecast.value,
                forecast.currency,
                'USD',
                forecast.valueDate
              );
            } catch (conversionError) {
              console.warn('[FSS Import API] Currency conversion failed for forecast:', forecast.year);
            }
          } else if (forecast.currency === 'USD') {
            usdAmount = forecast.value;
          }

          // Insert or update forecast
          const { error: forecastError } = await supabase
            .from('fss_forecasts')
            .upsert({
              fss_id: fss.id,
              forecast_year: parseInt(forecast.year),
              amount: parseFloat(forecast.value),
              currency: forecast.currency,
              value_date: forecast.valueDate || null,
              usd_amount: usdAmount,
              updated_at: new Date().toISOString()
            }, { onConflict: 'fss_id,forecast_year' })
            .select()
            .single();

          if (forecastError) {
            console.error('[FSS Import API] Error importing forecast:', forecastError);
            errors.push(`Forecast ${forecast.year}: ${forecastError.message}`);
          } else {
            importedForecasts++;
          }
        } catch (err: any) {
          console.error('[FSS Import API] Unexpected error processing forecast:', err);
          errors.push(`Forecast ${forecast.year}: ${err.message}`);
        }
      }
    }

    console.log('[FSS Import API] Import complete:', {
      fssId: fss.id,
      importedForecasts,
      errors: errors.length
    });

    return NextResponse.json({
      success: true,
      fss_id: fss.id,
      imported_forecasts: importedForecasts,
      total_forecasts: fssData.forecasts?.length || 0,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('[FSS Import API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

