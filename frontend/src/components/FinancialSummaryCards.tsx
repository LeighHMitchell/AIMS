"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { HeroCard } from "@/components/ui/hero-card";
import { cn } from "@/lib/utils";
import { normalizeTransactionType } from "@/lib/transaction-usd-helper";
import { StaggerContainer, StaggerItem } from "@/components/ui/stagger";

interface Budget {
  id?: string;
  usd_value?: number;
  value?: number;
  currency?: string;
  value_date?: string;
  period_start?: string;
  usd_convertible?: boolean;
  exchange_rate_manual?: boolean;
}

interface PlannedDisbursement {
  id?: string;
  usd_amount?: number;
  amount?: number;
  currency?: string;
  value_date?: string;
  period_start?: string;
  usd_convertible?: boolean;
  exchange_rate_manual?: boolean;
}

interface FinancialSummaryCardsProps {
  activityId: string;
  className?: string;
  // Optional prop to provide real-time budget data
  budgets?: Budget[];
  // Control whether to show the bar chart on the Total Budgeted card
  showBudgetChart?: boolean;
  // Control whether to hide the Total Budgeted card
  hideTotalBudgeted?: boolean;
}

export function FinancialSummaryCards({ activityId, className, budgets, showBudgetChart = true, hideTotalBudgeted = false }: FinancialSummaryCardsProps) {
  const [totalBudgeted, setTotalBudgeted] = useState(0);
  const [plannedDisbursements, setPlannedDisbursements] = useState(0);
  const [totalCommitted, setTotalCommitted] = useState(0);
  const [totalDisbursed, setTotalDisbursed] = useState(0);
  const [totalExpended, setTotalExpended] = useState(0);
  const [totalDisbursedAndExpended, setTotalDisbursedAndExpended] = useState(0);
  const [hasMissingUsdValues, setHasMissingUsdValues] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [budgetsByYear, setBudgetsByYear] = useState<Array<{ year: number; amount: number }>>([]);
  const [unconvertedCount, setUnconvertedCount] = useState(0);

  // Use refs to track previous values and prevent unnecessary updates
  const prevBudgetsRef = useRef<Budget[] | undefined>();
  const prevTotalBudgetedRef = useRef<number>(0);

  const fetchFinancials = useCallback(async () => {
    
    let unconverted = 0;
    
    // ================================================================
    // USE STORED USD VALUES FOR BUDGETS (NO API CALLS)
    // ================================================================
    const { data: budgetsData, error: budgetsError } = await supabase
      .from("activity_budgets")
      .select("*")
      .eq("activity_id", activityId);
    
    
    let totalBudgetedUSD = 0;
    const budgetsByYearMap = new Map<number, number>();
    
    if (budgetsData && !budgetsError) {
      for (const budget of budgetsData) {
        if (!budget.value || !budget.currency) {
          continue;
        }
        
        // Extract year from period_start or use current year
        let year = new Date().getFullYear();
        if (budget.period_start) {
          year = new Date(budget.period_start).getFullYear();
        }
        
        // OPTIMIZED: Use stored USD value instead of making API call
        let usdAmount = 0;
        
        // First, try stored usd_value
        if (budget.usd_value != null && !isNaN(budget.usd_value)) {
          usdAmount = budget.usd_value;
        } 
        // If currency is USD, use original value
        else if (budget.currency === 'USD') {
          usdAmount = budget.value;
        }
        // Otherwise, it's unconverted (will be handled by retry job)
        else {
          unconverted++;
        }
        
        totalBudgetedUSD += usdAmount;
        
        if (usdAmount > 0) {
          const currentAmount = budgetsByYearMap.get(year) || 0;
          budgetsByYearMap.set(year, currentAmount + usdAmount);
        }
      }
    }
    
    // Convert map to array and sort by year
    const budgetsByYearArray = Array.from(budgetsByYearMap.entries())
      .map(([year, amount]) => ({ year, amount }))
      .sort((a, b) => a.year - b.year);
    
    
    setTotalBudgeted(totalBudgetedUSD);
    prevTotalBudgetedRef.current = totalBudgetedUSD;
    setBudgetsByYear(budgetsByYearArray);

    // ================================================================
    // USE STORED USD VALUES FOR PLANNED DISBURSEMENTS (NO API CALLS)
    // ================================================================
    const { data: disb, error: disbError } = await supabase
      .from("planned_disbursements")
      .select("*")
      .eq("activity_id", activityId);
    
    
    let plannedDisbursementsUSD = 0;
    if (disb && !disbError) {
      for (const disbursement of disb) {
        if (!disbursement.amount || !disbursement.currency) {
          continue;
        }
        
        // OPTIMIZED: Use stored USD value instead of making API call
        let usdAmount = 0;
        
        // First, try stored usd_amount
        if (disbursement.usd_amount != null && !isNaN(disbursement.usd_amount)) {
          usdAmount = disbursement.usd_amount;
        }
        // If currency is USD, use original amount
        else if (disbursement.currency === 'USD') {
          usdAmount = disbursement.amount;
        }
        // Otherwise, it's unconverted (will be handled by retry job)
        else {
          unconverted++;
        }
        
        plannedDisbursementsUSD += usdAmount;
      }
    }
    
    setPlannedDisbursements(plannedDisbursementsUSD);

    // ================================================================
    // TRANSACTIONS - Already uses stored value_usd (no changes needed)
    // ================================================================
    const { data: txs, error: txsError } = await supabase
      .from("transactions")
      .select("*")
      .eq("activity_id", activityId);
    
    
    let committed = 0, disbursed = 0, disbursedOnly = 0, expended = 0, missingUsd = false;
    if (!txsError && txs) {
      txs.forEach(t => {
        // Use the correct USD column for transactions: value_usd (with fallbacks for schema variations)
        let usdValue = t.value_usd || t.value_USD || t.usd_value || t.USD_value;
        
        // If transaction is in USD but value_usd is missing, use the original value
        // (This is safe because it's already USD)
        if (!usdValue && t.currency === 'USD' && t.value && t.value > 0) {
          usdValue = t.value;
        }
        
        // Track unconverted transactions
        if (!usdValue && t.currency !== 'USD' && t.value > 0) {
          unconverted++;
        }
        
        // Normalize transaction type to string for consistent comparison
        const transactionType = normalizeTransactionType(t.transaction_type);
        
        if (transactionType === '2') {
          if (usdValue && usdValue > 0) {
            committed += usdValue;
          } else if (t.currency !== 'USD') {
            missingUsd = true;
          }
        }
        if (transactionType === '3') {
          if (usdValue && usdValue > 0) {
            disbursedOnly += usdValue;
            disbursed += usdValue;
          } else if (t.currency !== 'USD') {
            missingUsd = true;
          }
        }
        if (transactionType === '4') {
          if (usdValue && usdValue > 0) {
            expended += usdValue;
            disbursed += usdValue;
          } else if (t.currency !== 'USD') {
            missingUsd = true;
          }
        }
      });
    }
    
    setTotalCommitted(committed);
    setTotalDisbursed(disbursedOnly);
    setTotalExpended(expended);
    setTotalDisbursedAndExpended(disbursed);
    setHasMissingUsdValues(missingUsd || unconverted > 0);
    setUnconvertedCount(unconverted);
  }, [activityId, supabase]);

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
  useEffect(() => {
    if (!isInitialized || !budgets) return;

    // Check if budgets actually changed (not just a re-render)
    const budgetsChanged = JSON.stringify(budgets) !== JSON.stringify(prevBudgetsRef.current);
    
    if (budgetsChanged) {
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


  return (
    <StaggerContainer className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {!hideTotalBudgeted && (
        <StaggerItem>
        <HeroCard
          title="Total Budgeted"
          subtitle="Planned budget for the full activity lifecycle"
          staticValue={totalBudgeted}
          currency="USD"
          animate={false}
          budgetsByYear={budgetsByYear}
          showChart={showBudgetChart}
          secondaryValues={[
            { value: totalDisbursed, label: "Total Disbursed" },
            { value: totalExpended, label: "Total Expended" }
          ]}
        />
        </StaggerItem>
      )}

      <StaggerItem>
      <HeroCard
        title="Total Disbursed & Expended"
        subtitle="Funds transferred and spent by implementers"
        staticValue={totalDisbursedAndExpended}
        currency="USD"
        hasWarning={hasMissingUsdValues}
        warningMessage={unconvertedCount > 0 
          ? `${unconvertedCount} record(s) pending USD conversion. These will be converted automatically.`
          : "Some transactions are missing USD conversion. Please ensure all transactions have a value date for accurate USD totals."
        }
        animate={false}
      />
      </StaggerItem>
    </StaggerContainer>
  );
}
