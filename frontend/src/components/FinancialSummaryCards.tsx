"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { HeroCard } from "@/components/ui/hero-card";
import { cn } from "@/lib/utils";
import { fixedCurrencyConverter } from "@/lib/currency-converter-fixed";

interface Budget {
  id?: string;
  usd_value?: number;
  value?: number;
  currency?: string;
  value_date?: string;
  period_start?: string;
}

interface FinancialSummaryCardsProps {
  activityId: string;
  className?: string;
  // Optional prop to provide real-time budget data
  budgets?: Budget[];
  // Control whether to show the bar chart on the Total Budgeted card
  showBudgetChart?: boolean;
}

export function FinancialSummaryCards({ activityId, className, budgets, showBudgetChart = true }: FinancialSummaryCardsProps) {
  const [totalBudgeted, setTotalBudgeted] = useState(0);
  const [plannedDisbursements, setPlannedDisbursements] = useState(0);
  const [totalCommitted, setTotalCommitted] = useState(0);
  const [totalDisbursedAndExpended, setTotalDisbursedAndExpended] = useState(0);
  const [hasMissingUsdValues, setHasMissingUsdValues] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [budgetsByYear, setBudgetsByYear] = useState<Array<{ year: number; amount: number }>>([]);

  // Use refs to track previous values and prevent unnecessary updates
  const prevBudgetsRef = useRef<Budget[] | undefined>();
  const prevTotalBudgetedRef = useRef<number>(0);

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const fetchFinancials = useCallback(async () => {
    console.log('[FinancialSummaryCards] Starting REAL-TIME fetchFinancials for activityId:', activityId);
    
    // ================================================================
    // REAL-TIME USD CONVERSION FOR BUDGETS
    // ================================================================
    const { data: budgets, error: budgetsError } = await supabase
      .from("activity_budgets")
      .select("*")
      .eq("activity_id", activityId);
    
    console.log('[FinancialSummaryCards] Budgets fetched:', budgets?.length || 0);
    
    let totalBudgetedUSD = 0;
    if (budgets && !budgetsError) {
      // Real-time conversion for each budget (like the table does)
      for (const budget of budgets) {
        if (!budget.value || !budget.currency) {
          console.log('[FinancialSummaryCards] Skipping budget - missing value or currency');
          continue;
        }
        
        try {
          const valueDate = budget.value_date ? new Date(budget.value_date) : new Date();
          const result = await fixedCurrencyConverter.convertToUSD(
            budget.value,
            budget.currency,
            valueDate
          );
          
          if (result.success && result.usd_amount) {
            totalBudgetedUSD += result.usd_amount;
            console.log(`[FinancialSummaryCards] ✅ Budget ${budget.value} ${budget.currency} → $${result.usd_amount} USD (rate: ${result.exchange_rate})`);
          } else {
            console.warn(`[FinancialSummaryCards] ⚠️ Failed to convert budget: ${result.error}`);
          }
        } catch (err) {
          console.error('[FinancialSummaryCards] Real-time conversion error for budget:', err);
        }
      }
    }
    
    console.log('[FinancialSummaryCards] Total Budgeted (REAL-TIME):', totalBudgetedUSD);
    setTotalBudgeted(totalBudgetedUSD);
    prevTotalBudgetedRef.current = totalBudgetedUSD;

    // Group budgets by year for the chart
    const budgetsByYearMap = new Map<number, number>();
    if (budgets && !budgetsError) {
      for (const budget of budgets) {
        if (!budget.value || !budget.currency) continue;
        
        // Extract year from period_start or use current year
        let year = new Date().getFullYear();
        if (budget.period_start) {
          year = new Date(budget.period_start).getFullYear();
        }
        
        try {
          const valueDate = budget.value_date ? new Date(budget.value_date) : new Date();
          const result = await fixedCurrencyConverter.convertToUSD(
            budget.value,
            budget.currency,
            valueDate
          );
          
          if (result.success && result.usd_amount) {
            const currentAmount = budgetsByYearMap.get(year) || 0;
            budgetsByYearMap.set(year, currentAmount + result.usd_amount);
          }
        } catch (err) {
          console.error('[FinancialSummaryCards] Error grouping budget by year:', err);
        }
      }
    }
    
    // Convert map to array and sort by year
    const budgetsByYearArray = Array.from(budgetsByYearMap.entries())
      .map(([year, amount]) => ({ year, amount }))
      .sort((a, b) => a.year - b.year);
    
    console.log('[FinancialSummaryCards] Budgets by year:', budgetsByYearArray);
    setBudgetsByYear(budgetsByYearArray);

    // ================================================================
    // REAL-TIME USD CONVERSION FOR PLANNED DISBURSEMENTS
    // ================================================================
    const { data: disb, error: disbError } = await supabase
      .from("planned_disbursements")
      .select("*")
      .eq("activity_id", activityId);
    
    console.log('[FinancialSummaryCards] Planned disbursements fetched:', disb?.length || 0);
    
    let plannedDisbursementsUSD = 0;
    if (disb && !disbError) {
      // Real-time conversion for each disbursement (like the table does)
      for (const disbursement of disb) {
        if (!disbursement.amount || !disbursement.currency) {
          console.log('[FinancialSummaryCards] Skipping disbursement - missing amount or currency');
          continue;
        }
        
        try {
          const valueDate = disbursement.value_date ? new Date(disbursement.value_date) : new Date();
          const result = await fixedCurrencyConverter.convertToUSD(
            disbursement.amount,
            disbursement.currency,
            valueDate
          );
          
          if (result.success && result.usd_amount) {
            plannedDisbursementsUSD += result.usd_amount;
            console.log(`[FinancialSummaryCards] ✅ Disbursement ${disbursement.amount} ${disbursement.currency} → $${result.usd_amount} USD (rate: ${result.exchange_rate})`);
          } else {
            console.warn(`[FinancialSummaryCards] ⚠️ Failed to convert disbursement: ${result.error}`);
          }
        } catch (err) {
          console.error('[FinancialSummaryCards] Real-time conversion error for disbursement:', err);
        }
      }
    }
    
    console.log('[FinancialSummaryCards] Total Planned Disbursements (REAL-TIME):', plannedDisbursementsUSD);
    setPlannedDisbursements(plannedDisbursementsUSD);

    // Transactions: Committed (type 2), Disbursed/Expended (type 3 or 4) - using correct USD column: value_usd
    const { data: txs, error: txsError } = await supabase
      .from("transactions")
      .select("*")
      .eq("activity_id", activityId);
    console.log('[FinancialSummaryCards] Transactions FULL RESPONSE:', { txs, txsError });
    console.log('[FinancialSummaryCards] Transaction columns:', txs?.[0] ? Object.keys(txs[0]) : 'No data');
    console.log('[FinancialSummaryCards] First transaction row data:', txs?.[0]);
    let committed = 0, disbursed = 0, missingUsd = false;
    if (!txsError && txs) {
      txs.forEach(t => {
        // VERIFIED: Use the correct USD column for transactions: value_usd (with fallbacks for schema variations)
        let usdValue = t.value_usd || t.value_USD || t.usd_value || t.USD_value;
        
        // FIXED: If transaction is in USD but value_usd is missing, use the original value
        if (!usdValue && t.currency === 'USD' && t.value && t.value > 0) {
          usdValue = t.value;
          console.log(`[FinancialSummaryCards] Using original USD value for transaction ${t.id}: $${t.value}`);
        }
        
        if (t.transaction_type === '2') {
          if (usdValue && usdValue > 0) {
            committed += usdValue;
          } else if (t.currency !== 'USD') {
            // Only mark as missing USD if it's not a USD transaction
            missingUsd = true;
            console.log(`[FinancialSummaryCards] Commitment transaction ${t.id} missing USD value (${t.currency})`);
          }
        }
        if (t.transaction_type === '3' || t.transaction_type === '4') {
          if (usdValue && usdValue > 0) {
            disbursed += usdValue;
          } else if (t.currency !== 'USD') {
            // Only mark as missing USD if it's not a USD transaction
            missingUsd = true;
            console.log(`[FinancialSummaryCards] Disbursement/Expenditure transaction ${t.id} missing USD value (${t.currency})`);
          }
        }
      });
    }
    console.log('[FinancialSummaryCards] Setting committed to:', committed, 'disbursed to:', disbursed);
    setTotalCommitted(committed);
    setTotalDisbursedAndExpended(disbursed);
    setHasMissingUsdValues(missingUsd);
  }, [activityId]);

  // Initial load - only run once when activityId changes
  useEffect(() => {
    if (activityId) {
      setIsInitialized(false);
      setIsUpdating(false);
      setJustUpdated(false);
      fetchFinancials().then(() => {
        setIsInitialized(true);
      });
    }
  }, [activityId, fetchFinancials]);

  // Only update reactively if we're initialized and budgets actually changed
  // Note: With real-time conversion, we trigger a full refresh instead of using cached values
  useEffect(() => {
    if (!isInitialized || !budgets) return;

    // Check if budgets actually changed (not just a re-render)
    const budgetsChanged = JSON.stringify(budgets) !== JSON.stringify(prevBudgetsRef.current);
    
    if (budgetsChanged) {
      console.log('[FinancialSummaryCards] Budgets prop changed - triggering real-time refresh');
      // Trigger a full real-time refresh instead of using cached values
      setIsUpdating(true);
      fetchFinancials().then(() => {
        setIsUpdating(false);
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 1500);
      });
    }
    
    // Update the ref to track current budgets
    prevBudgetsRef.current = budgets;
  }, [budgets, isInitialized, fetchFinancials]);

  // Listen for refresh events from budget and other components
  useEffect(() => {
    const handleRefresh = () => {
      if (activityId && isInitialized) {
        setIsUpdating(true);
        fetchFinancials().then(() => {
          // Show updated confirmation and clear updating state after animation
          setTimeout(() => {
            setIsUpdating(false);
            setJustUpdated(true);
            
            // Clear just updated state after brief show
            setTimeout(() => setJustUpdated(false), 1500);
          }, 800);
        });
      }
    };

    // Listen for custom refresh events
    window.addEventListener('refreshFinancialSummaryCards', handleRefresh);
    
    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('refreshFinancialSummaryCards', handleRefresh);
    };
  }, [activityId, isInitialized, fetchFinancials]);

  console.log('[FinancialSummaryCards] Rendering with state:', { totalBudgeted, plannedDisbursements, totalCommitted, totalDisbursedAndExpended });
  console.log('[FinancialSummaryCards] Raw values being passed to HeroCards:', {
    totalBudgeted: totalBudgeted,
    plannedDisbursements: plannedDisbursements, 
    totalCommitted: totalCommitted,
    totalDisbursedAndExpended: totalDisbursedAndExpended,
    activityId: activityId
  });

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      <HeroCard
        title="Total Budgeted"
        subtitle="Planned budget for the full activity lifecycle"
        staticValue={totalBudgeted}
        currency="USD"
        animate={false}
        budgetsByYear={budgetsByYear}
        showChart={showBudgetChart}
      />
      
      <HeroCard
        title="Planned Disbursements"
        subtitle="Future disbursements scheduled but not yet made"
        staticValue={plannedDisbursements}
        currency="USD"
        animate={false}
      />
      
      <HeroCard
        title="Total Committed"
        subtitle="Funds legally committed to partners or implementers"
        staticValue={totalCommitted}
        currency="USD"
        animate={false}
      />
      
      <HeroCard
        title="Total Disbursed & Expended"
        subtitle="Funds transferred and spent by implementers"
        staticValue={totalDisbursedAndExpended}
        currency="USD"
        hasWarning={hasMissingUsdValues}
        warningMessage="Some transactions are missing USD conversion. Please ensure all transactions have a value date for accurate USD totals."
        animate={false}
      />
    </div>
  );
} 