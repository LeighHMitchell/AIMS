import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getOrCreateOrganization } from '@/lib/organization-helpers';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const disbursementData = await request.json();
    
    // Validate required fields
    if (!disbursementData.activity_id || !disbursementData.amount || !disbursementData.period_start || !disbursementData.period_end) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate type if provided (IATI BudgetType: 1=Original, 2=Revised)
    if (disbursementData.type && !['1', '2'].includes(disbursementData.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be 1 (Original) or 2 (Revised)' },
        { status: 400 }
      );
    }

    // Check/create provider organization if name provided
    let providerOrgId = disbursementData.provider_org_id || null;
    if (!providerOrgId && disbursementData.provider_org_name) {
      providerOrgId = await getOrCreateOrganization(supabaseAdmin, {
        ref: disbursementData.provider_org_ref,
        name: disbursementData.provider_org_name,
        type: disbursementData.provider_org_type
      });
      if (providerOrgId) {
        disbursementData.provider_org_id = providerOrgId;
      }
    }

    // Check/create receiver organization if name provided
    let receiverOrgId = disbursementData.receiver_org_id || null;
    if (!receiverOrgId && disbursementData.receiver_org_name) {
      receiverOrgId = await getOrCreateOrganization(supabaseAdmin, {
        ref: disbursementData.receiver_org_ref,
        name: disbursementData.receiver_org_name,
        type: disbursementData.receiver_org_type
      });
      if (receiverOrgId) {
        disbursementData.receiver_org_id = receiverOrgId;
      }
    }

    // Convert to USD - support manual exchange rate override
    let usdAmount = null;
    let exchangeRateUsed = null;
    let usdConvertible = true;
    const isManualRate = disbursementData.exchange_rate_manual === true;

    if (disbursementData.currency === 'USD') {
      // USD currency - no conversion needed
      usdAmount = disbursementData.amount;
      exchangeRateUsed = 1.0;
    } else if (isManualRate && disbursementData.exchange_rate_used && disbursementData.usd_amount != null) {
      // Use manually provided exchange rate
      usdAmount = disbursementData.usd_amount;
      exchangeRateUsed = disbursementData.exchange_rate_used;
      console.log(`[Planned Disbursements API] Using manual exchange rate: ${disbursementData.amount} ${disbursementData.currency} → $${usdAmount} USD (rate: ${exchangeRateUsed})`);
    } else if (disbursementData.amount) {
      // Fetch exchange rate from API
      const valueDate = disbursementData.value_date || disbursementData.period_start || new Date().toISOString().split('T')[0];
      try {
        const result = await fixedCurrencyConverter.convertToUSD(
          disbursementData.amount,
          disbursementData.currency,
          new Date(valueDate)
        );
        if (result.success && result.usd_amount != null) {
          usdAmount = result.usd_amount;
          exchangeRateUsed = result.exchange_rate;
          console.log(`[Planned Disbursements API] Converted ${disbursementData.amount} ${disbursementData.currency} → $${usdAmount} USD (rate: ${exchangeRateUsed})`);
        } else {
          usdConvertible = false;
          console.warn('[Planned Disbursements API] Currency conversion failed:', result.error);
        }
      } catch (error) {
        usdConvertible = false;
        console.error('[Planned Disbursements API] Error converting to USD:', error);
      }
    }
    disbursementData.usd_amount = usdAmount;
    disbursementData.exchange_rate_used = exchangeRateUsed;
    disbursementData.usd_conversion_date = new Date().toISOString();
    disbursementData.usd_convertible = usdConvertible;
    disbursementData.exchange_rate_manual = isManualRate;

    // Insert the planned disbursement using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('planned_disbursements')
      .insert(disbursementData)
      .select()
      .single();

    if (error) {
      console.error('Error inserting planned disbursement:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const { id, ...updateData } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing disbursement ID' },
        { status: 400 }
      );
    }

    // Validate type if provided (IATI BudgetType: 1=Original, 2=Revised)
    if (updateData.type && !['1', '2'].includes(updateData.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be 1 (Original) or 2 (Revised)' },
        { status: 400 }
      );
    }

    // Check/create provider organization if name provided
    if (!updateData.provider_org_id && updateData.provider_org_name) {
      const providerOrgId = await getOrCreateOrganization(supabaseAdmin, {
        ref: updateData.provider_org_ref,
        name: updateData.provider_org_name,
        type: updateData.provider_org_type
      });
      if (providerOrgId) {
        updateData.provider_org_id = providerOrgId;
      }
    }

    // Check/create receiver organization if name provided
    if (!updateData.receiver_org_id && updateData.receiver_org_name) {
      const receiverOrgId = await getOrCreateOrganization(supabaseAdmin, {
        ref: updateData.receiver_org_ref,
        name: updateData.receiver_org_name,
        type: updateData.receiver_org_type
      });
      if (receiverOrgId) {
        updateData.receiver_org_id = receiverOrgId;
      }
    }

    // Convert to USD - support manual exchange rate override
    const isManualRate = updateData.exchange_rate_manual === true;

    if (updateData.amount !== undefined || updateData.currency !== undefined || updateData.value_date !== undefined || isManualRate) {
      // Need to fetch current values if not all provided
      let amount = updateData.amount;
      let currency = updateData.currency || 'USD';
      let valueDate = updateData.value_date;
      let periodStart = updateData.period_start;

      if (amount === undefined || currency === undefined || valueDate === undefined) {
        const { data: existing } = await supabaseAdmin
          .from('planned_disbursements')
          .select('amount, currency, value_date, period_start')
          .eq('id', id)
          .single();
        
        if (existing) {
          amount = amount !== undefined ? amount : existing.amount;
          currency = currency !== undefined ? currency : existing.currency;
          valueDate = valueDate !== undefined ? valueDate : existing.value_date;
          periodStart = periodStart !== undefined ? periodStart : existing.period_start;
        }
      }

      if (amount !== undefined && currency) {
        let usdAmount = null;
        let exchangeRateUsed = null;
        let usdConvertible = true;

        if (currency === 'USD') {
          // USD currency - no conversion needed
          usdAmount = amount;
          exchangeRateUsed = 1.0;
        } else if (isManualRate && updateData.exchange_rate_used && updateData.usd_amount != null) {
          // Use manually provided exchange rate
          usdAmount = updateData.usd_amount;
          exchangeRateUsed = updateData.exchange_rate_used;
          console.log(`[Planned Disbursements API] Using manual exchange rate: ${amount} ${currency} → $${usdAmount} USD (rate: ${exchangeRateUsed})`);
        } else {
          // Fetch exchange rate from API
          const conversionDate = valueDate || periodStart || new Date().toISOString().split('T')[0];
          try {
            const result = await fixedCurrencyConverter.convertToUSD(
              amount,
              currency,
              new Date(conversionDate)
            );
            if (result.success && result.usd_amount != null) {
              usdAmount = result.usd_amount;
              exchangeRateUsed = result.exchange_rate;
              console.log(`[Planned Disbursements API] Updated conversion: ${amount} ${currency} → $${usdAmount} USD (rate: ${exchangeRateUsed})`);
            } else {
              usdConvertible = false;
              console.warn('[Planned Disbursements API] Currency conversion failed:', result.error);
            }
          } catch (error) {
            usdConvertible = false;
            console.error('[Planned Disbursements API] Error converting to USD:', error);
          }
        }
        updateData.usd_amount = usdAmount;
        updateData.exchange_rate_used = exchangeRateUsed;
        updateData.usd_conversion_date = new Date().toISOString();
        updateData.usd_convertible = usdConvertible;
        updateData.exchange_rate_manual = isManualRate;
      }
    }

    // Update the planned disbursement using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('planned_disbursements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating planned disbursement:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing disbursement ID' },
        { status: 400 }
      );
    }

    // Delete the planned disbursement using admin client (bypasses RLS)
    const { error } = await supabaseAdmin
      .from('planned_disbursements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting planned disbursement:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}