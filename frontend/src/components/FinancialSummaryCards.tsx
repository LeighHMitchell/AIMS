"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  const [loading, setLoading] = useState(true);

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        setLoading(true);

        // Fetch all data in parallel for better performance
        const [budgetsResult, disbursementsResult, transactionsResult] = await Promise.all([
          // Total Budgeted
          supabase
            .from("activity_budgets")
            .select("value")
            .eq("activity_id", activityId),
          
          // Planned Disbursements
          supabase
            .from("planned_disbursements")
            .select("amount")
            .eq("activity_id", activityId),
          
          // Transactions for Committed and Disbursed/Expended
          supabase
            .from("transactions")
            .select("value, transaction_type")
            .eq("activity_id", activityId)
            .in("transaction_type", [1, 3, 4])
        ]);

        // Calculate Total Budgeted
        const totalBudgeted = budgetsResult.data?.reduce(
          (sum, budget) => sum + (budget.value || 0), 
          0
        ) || 0;

        // Calculate Planned Disbursements
        const plannedDisbursements = disbursementsResult.data?.reduce(
          (sum, disbursement) => sum + (disbursement.amount || 0), 
          0
        ) || 0;

        // Calculate Total Committed and Total Disbursed/Expended
        let totalCommitted = 0;
        let totalDisbursedAndExpended = 0;

        transactionsResult.data?.forEach((transaction) => {
          if (transaction.transaction_type === 1) {
            totalCommitted += transaction.value || 0;
          } else if (transaction.transaction_type === 3 || transaction.transaction_type === 4) {
            totalDisbursedAndExpended += transaction.value || 0;
          }
        });

        setData({
          totalBudgeted,
          plannedDisbursements,
          totalCommitted,
          totalDisbursedAndExpended,
        });
      } catch (error) {
        console.error("Error fetching financial data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (activityId) {
      fetchFinancialData();
    }
  }, [activityId, supabase]);

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
      value: data.totalBudgeted,
    },
    {
      title: "Planned Disbursements",
      subtitle: "Future disbursements scheduled but not yet made",
      value: data.plannedDisbursements,
    },
    {
      title: "Total Committed",
      subtitle: "Funds legally committed to partners or implementers",
      value: data.totalCommitted,
    },
    {
      title: "Total Disbursed & Expended",
      subtitle: "Funds transferred and spent by implementers",
      value: data.totalDisbursedAndExpended,
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
              <p className="text-3xl font-bold text-black">
                {loading ? "$0" : formatCurrency(card.value)}
              </p>
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