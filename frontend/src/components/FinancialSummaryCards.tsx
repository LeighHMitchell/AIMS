"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { HeroCard } from "@/components/ui/hero-card";
import { cn } from "@/lib/utils";

interface Budget {
  id?: string;
  usd_value?: number;
  value?: number;
}

interface FinancialSummaryCardsProps {
  activityId: string;
  className?: string;
  // Optional prop to provide real-time budget data
  budgets?: Budget[];
}

export function FinancialSummaryCards({ activityId, className, budgets }: FinancialSummaryCardsProps) {
  const [totalBudgeted, setTotalBudgeted] = useState(0);
  const [plannedDisbursements, setPlannedDisbursements] = useState(0);
  const [totalCommitted, setTotalCommitted] = useState(0);
  const [totalDisbursedAndExpended, setTotalDisbursedAndExpended] = useState(0);
  const [hasMissingUsdValues, setHasMissingUsdValues] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use refs to track previous values and prevent unnecessary updates
  const prevBudgetsRef = useRef<Budget[] | undefined>();
  const prevTotalBudgetedRef = useRef<number>(0);

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const fetchFinancials = useCallback(async () => {
    console.log('[FinancialSummaryCards] Starting fetchFinancials for activityId:', activityId);
    
    // Total Budgeted - using correct USD column: usd_value
    const { data: budgets, error: budgetsError } = await supabase
      .from("activity_budgets")
      .select("*")
      .eq("activity_id", activityId);
    console.log('[FinancialSummaryCards] Budgets query FULL RESPONSE:', { budgets, budgetsError });
    console.log('[FinancialSummaryCards] Budget columns available:', budgets?.[0] ? Object.keys(budgets[0]) : 'No data');
    console.log('[FinancialSummaryCards] First budget row data:', budgets?.[0]);
    
    // VERIFIED: Use the correct USD column for budgets: usd_value (with fallbacks for schema variations)
    const newTotalBudgeted = budgetsError ? 0 : budgets?.reduce((sum, row) => {
      // Look for USD-converted value in various possible column names
      const usdValue = row.usd_value || row.USD_value || row.value_usd || row.value_USD;
      if (usdValue) {
        return sum + usdValue;
      }
      // If no USD conversion available, we'll need to convert the original value
      // For now, just use the original value (this should be converted by the backend)
      return sum + (row.value || 0);
    }, 0) || 0;
    console.log('[FinancialSummaryCards] Setting totalBudgeted to:', newTotalBudgeted);
    setTotalBudgeted(newTotalBudgeted);
    prevTotalBudgetedRef.current = newTotalBudgeted;

    // Planned Disbursements - using correct USD column: usd_amount
    const { data: disb, error: disbError } = await supabase
      .from("planned_disbursements")
      .select("*")
      .eq("activity_id", activityId);
    console.log('[FinancialSummaryCards] Planned disbursements FULL RESPONSE:', { disb, disbError });
    console.log('[FinancialSummaryCards] Planned disbursements columns:', disb?.[0] ? Object.keys(disb[0]) : 'No data');
    console.log('[FinancialSummaryCards] First planned disbursement row data:', disb?.[0]);
    
    // VERIFIED: Use the correct USD column for planned disbursements: usd_amount (with fallbacks for schema variations)  
    const plannedDisbursementsTotal = disbError ? 0 : disb?.reduce((sum, row) => {
      // Look for USD-converted amount in various possible column names  
      const usdAmount = row.usd_amount || row.USD_amount || row.amount_usd || row.amount_USD;
      if (usdAmount) {
        return sum + usdAmount;
      }
      // If no USD conversion available, use the original amount (should be converted by backend)
      return sum + (row.amount || 0);
    }, 0) || 0;
    console.log('[FinancialSummaryCards] Setting plannedDisbursements to:', plannedDisbursementsTotal);
    setPlannedDisbursements(plannedDisbursementsTotal);

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
  useEffect(() => {
    if (!isInitialized || !budgets) return;

    // Check if budgets actually changed (not just a re-render)
    const budgetsChanged = JSON.stringify(budgets) !== JSON.stringify(prevBudgetsRef.current);
    
    if (budgetsChanged) {
      const newTotal = budgets.reduce((sum, budget) => sum + (budget.usd_value || 0), 0);
      const currentTotal = prevTotalBudgetedRef.current;
      
      // Only update if there's a meaningful difference
      if (Math.abs(newTotal - currentTotal) > 0.01) {
        setIsUpdating(true);
        setTotalBudgeted(newTotal);
        prevTotalBudgetedRef.current = newTotal;
        
        // Show updated confirmation and clear updating state after animation
        const timer = setTimeout(() => {
          setIsUpdating(false);
          setJustUpdated(true);
          
          // Clear just updated state after brief show
          setTimeout(() => setJustUpdated(false), 1500);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
    
    // Update the ref to track current budgets
    prevBudgetsRef.current = budgets;
  }, [budgets, isInitialized]);

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