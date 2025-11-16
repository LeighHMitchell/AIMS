import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActivityData(activityId: string) {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🔍 DIAGNOSTIC: Checking Activity Data in Database');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('Activity ID:', activityId);
  console.log('');

  // 1. Check basic activity fields
  console.log('📋 BASIC ACTIVITY FIELDS:');
  console.log('─────────────────────────────────────────────────────────────────');
  const { data: activity, error: activityError } = await supabase
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .single();

  if (activityError) {
    console.error('❌ Error fetching activity:', activityError);
    return;
  }

  console.log('Title:', activity.title_narrative);
  console.log('IATI Identifier:', activity.iati_identifier);
  console.log('Default Currency:', activity.default_currency);
  console.log('Default Aid Type:', activity.default_aid_type);
  console.log('Default Finance Type:', activity.default_finance_type);
  console.log('Default Flow Type:', activity.default_flow_type);
  console.log('Default Tied Status:', activity.default_tied_status);
  console.log('Capital Spend %:', activity.capital_spend_percentage);
  console.log('');

  // 2. Check other identifiers
  console.log('🆔 OTHER IDENTIFIERS:');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('Other Identifiers field:', JSON.stringify(activity.other_identifiers, null, 2));
  console.log('');

  // 3. Check budgets
  console.log('💰 BUDGETS:');
  console.log('─────────────────────────────────────────────────────────────────');
  const { data: budgets, error: budgetsError } = await supabase
    .from('activity_budgets')
    .select('*')
    .eq('activity_id', activityId);

  if (budgetsError) {
    console.error('❌ Error fetching budgets:', budgetsError);
  } else {
    console.log(`Found ${budgets?.length || 0} budget(s):`);
    budgets?.forEach((budget, i) => {
      console.log(`  Budget ${i + 1}:`, {
        type: budget.type,
        status: budget.status,
        value: budget.value,
        currency: budget.currency,
        period_start: budget.period_start,
        period_end: budget.period_end
      });
    });
  }
  console.log('');

  // 4. Check planned disbursements
  console.log('📅 PLANNED DISBURSEMENTS:');
  console.log('─────────────────────────────────────────────────────────────────');
  const { data: disbursements, error: disbursementsError } = await supabase
    .from('planned_disbursements')
    .select('*')
    .eq('activity_id', activityId);

  if (disbursementsError) {
    console.error('❌ Error fetching planned disbursements:', disbursementsError);
  } else {
    console.log(`Found ${disbursements?.length || 0} planned disbursement(s):`);
    disbursements?.forEach((pd, i) => {
      console.log(`  Planned Disbursement ${i + 1}:`, {
        type: pd.type,
        amount: pd.amount,
        currency: pd.currency,
        period_start: pd.period_start,
        period_end: pd.period_end,
        provider_org_name: pd.provider_org_name,
        receiver_org_name: pd.receiver_org_name
      });
    });
  }
  console.log('');

  // 5. Check financing terms (CRS)
  console.log('💳 FINANCING TERMS (CRS):');
  console.log('─────────────────────────────────────────────────────────────────');
  const { data: financingTerms, error: financingError } = await supabase
    .from('activity_financing_terms')
    .select('*')
    .eq('activity_id', activityId);

  if (financingError) {
    console.error('❌ Error fetching financing terms:', financingError);
  } else {
    console.log(`Found ${financingTerms?.length || 0} financing term record(s):`);
    financingTerms?.forEach((ft, i) => {
      console.log(`  Financing Terms ${i + 1}:`, {
        channel_code: ft.channel_code,
        repayment_type: ft.repayment_type,
        repayment_plan: ft.repayment_plan,
        rate_1: ft.rate_1,
        rate_2: ft.rate_2,
        commitment_date: ft.commitment_date,
        repayment_first_date: ft.repayment_first_date,
        repayment_final_date: ft.repayment_final_date
      });
    });
  }
  console.log('');

  // 6. Check loan statuses
  console.log('📊 LOAN STATUSES:');
  console.log('─────────────────────────────────────────────────────────────────');
  const { data: loanStatuses, error: loanStatusError } = await supabase
    .from('activity_loan_status')
    .select('*')
    .eq('activity_id', activityId);

  if (loanStatusError) {
    console.error('❌ Error fetching loan statuses:', loanStatusError);
  } else {
    console.log(`Found ${loanStatuses?.length || 0} loan status record(s):`);
    loanStatuses?.forEach((ls, i) => {
      console.log(`  Loan Status ${i + 1}:`, {
        year: ls.year,
        currency: ls.currency,
        interest_received: ls.interest_received,
        principal_outstanding: ls.principal_outstanding
      });
    });
  }
  console.log('');

  // 7. Check tags
  console.log('🏷️  TAGS:');
  console.log('─────────────────────────────────────────────────────────────────');
  const { data: activityTags, error: tagsError } = await supabase
    .from('activity_tags')
    .select('*, tags(*)')
    .eq('activity_id', activityId);

  if (tagsError) {
    console.error('❌ Error fetching tags:', tagsError);
  } else {
    console.log(`Found ${activityTags?.length || 0} tag(s):`);
    activityTags?.forEach((tag, i) => {
      console.log(`  Tag ${i + 1}:`, {
        vocabulary: tag.tags?.vocabulary,
        code: tag.tags?.code,
        name: tag.tags?.name
      });
    });
  }
  console.log('');

  // 8. Check country budget items
  console.log('🌍 COUNTRY BUDGET ITEMS:');
  console.log('─────────────────────────────────────────────────────────────────');
  const { data: countryBudgetItems, error: cbiError } = await supabase
    .from('country_budget_items')
    .select('*, budget_items(*)')
    .eq('activity_id', activityId);

  if (cbiError) {
    console.error('❌ Error fetching country budget items:', cbiError);
  } else {
    console.log(`Found ${countryBudgetItems?.length || 0} country budget item record(s):`);
    countryBudgetItems?.forEach((cbi, i) => {
      console.log(`  Country Budget Items ${i + 1}:`, {
        vocabulary: cbi.vocabulary,
        budget_items: cbi.budget_items?.map((bi: any) => ({
          code: bi.code,
          percentage: bi.percentage,
          description: bi.description
        }))
      });
    });
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('✅ Diagnostic Complete');
  console.log('═══════════════════════════════════════════════════════════════════');
}

// Run the diagnostic
const activityId = process.argv[2] || '61693754-cc3e-4d06-ad44-f84218903ee7';
checkActivityData(activityId).catch(console.error);
