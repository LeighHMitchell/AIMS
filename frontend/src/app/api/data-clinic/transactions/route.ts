import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const missingFields = searchParams.get('missing_fields') === 'true';

  try {
    console.log('[Data Clinic API - Transactions] Fetching transactions...');
    
    // First try basic query
    let hasIatiFields = false;
    let transactions: any[] = [];
    
    // Try to get transactions with IATI fields
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          uuid,
          activity_id,
          transaction_type,
          aid_type,
          finance_type,
          flow_type,
          transaction_date,
          value,
          currency,
          provider_org_id,
          provider_org_name,
          receiver_org_id,
          receiver_org_name,
          organization_id,
          description,
          activities!inner (
            title_narrative
          ),
          organizations (
            name
          )
        `)
        .order('transaction_date', { ascending: false })
        .limit(100);

      if (!error && data) {
        transactions = data;
        hasIatiFields = true;
        console.log('[Data Clinic API - Transactions] Successfully loaded with IATI fields');
      }
    } catch (e) {
      console.log('[Data Clinic API - Transactions] IATI fields not available, trying basic query');
      
      // Fall back to basic query without IATI fields
      const { data: basicData, error: basicError } = await supabase
        .from('transactions')
        .select(`
          uuid,
          activity_id,
          transaction_type,
          transaction_date,
          value,
          currency,
          provider_org_name,
          receiver_org_name,
          description,
          activities!inner (
            title_narrative
          )
        `)
        .order('transaction_date', { ascending: false })
        .limit(100);

      if (basicError) {
        throw basicError;
      }
      
      transactions = basicData || [];
    }

    console.log('[Data Clinic API - Transactions] Found transactions:', transactions.length);

    if (!missingFields) {
      return NextResponse.json({ 
        transactions: transactions || [],
        hasIatiFields,
        message: hasIatiFields ? null : 'IATI fields missing - please run migration'
      });
    }

    // Calculate data gaps only if we have IATI fields
    const dataGaps = [];
    let transactionsWithGaps = [];

    if (hasIatiFields) {
      let missingFinanceType = 0;
      let missingAidType = 0;
      let missingFlowType = 0;
      let missingTransactionType = 0;
      let missingDate = 0;
      let futureDisbursements = 0;
      let missingOrganization = 0;
      let missingValue = 0;

      const now = new Date();

      for (const transaction of transactions) {
        let hasGap = false;

        if (!transaction.finance_type) {
          missingFinanceType++;
          hasGap = true;
        }
        if (!transaction.aid_type) {
          missingAidType++;
          hasGap = true;
        }
        if (!transaction.flow_type) {
          missingFlowType++;
          hasGap = true;
        }
        if (!transaction.transaction_type) {
          missingTransactionType++;
          hasGap = true;
        }
        if (!transaction.transaction_date) {
          missingDate++;
          hasGap = true;
        }
        if (!transaction.value || transaction.value === 0) {
          missingValue++;
          hasGap = true;
        }
        if (!transaction.provider_org_id && !transaction.receiver_org_id && !transaction.organization_id) {
          missingOrganization++;
          hasGap = true;
        }

        // Check for future-dated disbursements
        if (transaction.transaction_type === '3' && 
            transaction.transaction_date && 
            new Date(transaction.transaction_date) > now) {
          futureDisbursements++;
          hasGap = true;
        }

        if (hasGap) {
          transactionsWithGaps.push({
            id: transaction.uuid,
            activityId: transaction.activity_id,
            activityTitle: transaction.activities?.title_narrative,
            transactionType: transaction.transaction_type,
            aidType: transaction.aid_type,
            financeType: transaction.finance_type,
            flowType: transaction.flow_type,
            transactionDate: transaction.transaction_date,
            value: transaction.value,
            currency: transaction.currency,
            providerOrgId: transaction.provider_org_id,
            providerOrgName: transaction.provider_org_name,
            receiverOrgId: transaction.receiver_org_id,
            receiverOrgName: transaction.receiver_org_name,
            organizationId: transaction.organization_id,
            organizationName: transaction.organizations?.name,
            description: transaction.description
          });
        }
      }

      // Add data gaps summary
      if (missingFinanceType > 0) {
        dataGaps.push({ field: 'missing_finance_type', label: 'Missing Finance Type', count: missingFinanceType });
      }
      if (missingAidType > 0) {
        dataGaps.push({ field: 'missing_aid_type', label: 'Missing Aid Type', count: missingAidType });
      }
      if (missingFlowType > 0) {
        dataGaps.push({ field: 'missing_flow_type', label: 'Missing Flow Type', count: missingFlowType });
      }
      if (missingTransactionType > 0) {
        dataGaps.push({ field: 'missing_transaction_type', label: 'Missing Transaction Type', count: missingTransactionType });
      }
      if (missingDate > 0) {
        dataGaps.push({ field: 'missing_date', label: 'Missing Date', count: missingDate });
      }
      if (futureDisbursements > 0) {
        dataGaps.push({ field: 'future_disbursements', label: 'Future-dated Disbursements', count: futureDisbursements });
      }
      if (missingOrganization > 0) {
        dataGaps.push({ field: 'missing_organization', label: 'Missing Organization', count: missingOrganization });
      }
      if (missingValue > 0) {
        dataGaps.push({ field: 'missing_value', label: 'Missing Value', count: missingValue });
      }
    } else {
      // If no IATI fields, return all transactions
      transactionsWithGaps = transactions.map(transaction => ({
        id: transaction.uuid,
        activityId: transaction.activity_id,
        activityTitle: transaction.activities?.title_narrative,
        transactionType: transaction.transaction_type,
        transactionDate: transaction.transaction_date,
        value: transaction.value,
        currency: transaction.currency,
        providerOrgName: transaction.provider_org_name,
        receiverOrgName: transaction.receiver_org_name,
        description: transaction.description
      }));

      dataGaps.push({ 
        field: 'missing_columns', 
        label: 'Database Migration Required', 
        count: transactions.length 
      });
    }

    console.log('[Data Clinic API - Transactions] Transactions with gaps:', transactionsWithGaps.length);

    return NextResponse.json({
      transactions: transactionsWithGaps,
      dataGaps,
      hasIatiFields,
      message: hasIatiFields ? null : 'IATI fields missing - please run migration'
    });

  } catch (error) {
    console.error('[Data Clinic API - Transactions] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 