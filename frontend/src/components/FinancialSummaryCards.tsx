"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

interface FinancialSummaryCardsProps {
  activityId: string;
  className?: string;
}

interface SummaryData {
  totalBudgeted: number;
  plannedDisbursements: number;
  totalCommitted: number;
  totalDisbursedAndExpended: number;
}

function useAnimatedNumber(target: number, duration = 600) {
  const [value, setValue] = useState(target);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    let start: number | null = null;
    let prevValue = value;
    function animate(ts: number) {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(prevValue + (target - prevValue) * progress);
      if (progress < 1) {
        raf.current = requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    }
    raf.current = requestAnimationFrame(animate);
    return () => {
      if (raf.current !== null) {
        cancelAnimationFrame(raf.current);
      }
    };
    // eslint-disable-next-line
  }, [target]);
  return Math.round(value);
}

export function FinancialSummaryCards({ 
  activityId, 
  className 
}: FinancialSummaryCardsProps) {
  const [data, setData] = useState<SummaryData>({
    totalBudgeted: 0,
    plannedDisbursements: 0,
    totalCommitted: 0,
    totalDisbursedAndExpended: 0,
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        setIsFetching(true);

        // Fetch all data in parallel for better performance
        const [budgetsResult, disbursementsResult, transactionsResult, exceptionResult] = await Promise.all([
          // Total Budgeted - get budget values with currency and date for conversion
          supabase
            .from("activity_budgets")
            .select("value, currency, value_date")
            .eq("activity_id", activityId),
          
          // Planned Disbursements
          supabase
            .from("planned_disbursements")
            .select("amount")
            .eq("activity_id", activityId),
          
          // Transactions for Committed and Disbursed/Expended
          supabase
            .from("transactions")
            .select("value, currency, transaction_type, transaction_date")
            .eq("activity_id", activityId)
            .in("transaction_type", ["2", "3", "4"]),

          // Budget Exception
          supabase
            .from("activity_budget_exceptions")
            .select("id")
            .eq("activity_id", activityId)
            .single()
        ]);

        // Calculate Total Budgeted - convert all budget values to USD in parallel
        let totalBudgeted = 0;
        if (budgetsResult.data) {
          const conversions = budgetsResult.data.map(async (budget) => {
            if (budget.value && budget.currency) {
              if (budget.currency === 'USD') {
                return budget.value;
              } else {
                try {
                  const conversionDate = budget.value_date ? new Date(budget.value_date) : new Date();
                  const result = await fixedCurrencyConverter.convertToUSD(budget.value, budget.currency, conversionDate);
                  return (result.success && result.usd_amount) ? result.usd_amount : 0;
                } catch {
                  return 0;
                }
              }
            }
            return 0;
          });
          totalBudgeted = (await Promise.all(conversions)).reduce((sum, v) => sum + v, 0);
        }

        // If budget exception exists, set totalBudgeted to 0
        if (exceptionResult.data) {
          totalBudgeted = 0;
        }

        // Calculate Planned Disbursements
        const plannedDisbursements = disbursementsResult.data?.reduce(
          (sum, disbursement) => sum + (disbursement.amount || 0), 
          0
        ) || 0;

        // Calculate Total Committed and Total Disbursed/Expended in parallel
        let totalCommitted = 0;
        let totalDisbursedAndExpended = 0;
        if (transactionsResult.data) {
          const conversions = transactionsResult.data.map(async (transaction) => {
            if (transaction.transaction_type === "2") {
              // Commitment: sum as before (assume USD or treat as USD for now)
              return { committed: transaction.value || 0, disbursed: 0 };
            } else if (transaction.transaction_type === "3" || transaction.transaction_type === "4") {
              if (transaction.value && transaction.currency) {
                if (transaction.currency === 'USD') {
                  return { committed: 0, disbursed: transaction.value };
                } else {
                  try {
                    const conversionDate = transaction.transaction_date ? new Date(transaction.transaction_date) : new Date();
                    const result = await fixedCurrencyConverter.convertToUSD(transaction.value, transaction.currency, conversionDate);
                    return { committed: 0, disbursed: (result.success && result.usd_amount) ? result.usd_amount : 0 };
                  } catch {
                    return { committed: 0, disbursed: 0 };
                  }
                }
              }
            }
            return { committed: 0, disbursed: 0 };
          });
          const results = await Promise.all(conversions);
          totalCommitted = results.reduce((sum, r) => sum + r.committed, 0);
          totalDisbursedAndExpended = results.reduce((sum, r) => sum + r.disbursed, 0);
        }

        setData({
          totalBudgeted,
          plannedDisbursements,
          totalCommitted,
          totalDisbursedAndExpended,
        });
      } catch (error) {
        console.error("Error fetching financial data:", error);
      } finally {
        setIsFetching(false);
        setIsInitialLoad(false);
      }
    };

    if (activityId) {
      fetchFinancialData();
    }
  }, [activityId, supabase]);

  // After fetching data and before rendering cards
  const animatedTotalBudgeted = useAnimatedNumber(data.totalBudgeted);
  const animatedPlannedDisbursements = useAnimatedNumber(data.plannedDisbursements);
  const animatedTotalCommitted = useAnimatedNumber(data.totalCommitted);
  const animatedTotalDisbursedAndExpended = useAnimatedNumber(data.totalDisbursedAndExpended);

  // Format currency with commas
  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const cards = [
    {
      title: "Total Budgeted",
      subtitle: "Planned budget for the full activity lifecycle",
      value: animatedTotalBudgeted,
    },
    {
      title: "Planned Disbursements",
      subtitle: "Future disbursements scheduled but not yet made",
      value: animatedPlannedDisbursements,
    },
    {
      title: "Total Committed",
      subtitle: "Funds legally committed to partners or implementers",
      value: animatedTotalCommitted,
    },
    {
      title: "Total Disbursed & Expended",
      subtitle: "Funds transferred and spent by implementers",
      value: animatedTotalDisbursedAndExpended,
    },
  ];

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {cards.map((card, index) => (
        <Card 
          key={index} 
          className="bg-white border border-gray-200 rounded-lg"
        >
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">
                {card.title}
              </p>
              <div className="relative">
                <p className={cn(
                  "text-3xl font-bold text-black transition-opacity duration-200",
                  isFetching && !isInitialLoad ? "opacity-75" : "opacity-100"
                )}>
                  {/* Only show $0 on initial load when no data exists */}
                  {isInitialLoad && card.value === 0 ? "$0" : formatCurrency(card.value)}
                </p>
              </div>
              <p className="text-xs text-gray-500">
                {card.subtitle}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 