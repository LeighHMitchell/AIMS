"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FinancialSummaryCardsProps {
  activityId: string;
  className?: string;
}

export function FinancialSummaryCards({ activityId, className }: FinancialSummaryCardsProps) {
  const [totalBudgeted, setTotalBudgeted] = useState(0);
  const [plannedDisbursements, setPlannedDisbursements] = useState(0);
  const [totalCommitted, setTotalCommitted] = useState(0);
  const [totalDisbursedAndExpended, setTotalDisbursedAndExpended] = useState(0);

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  useEffect(() => {
    async function fetchFinancials() {
      // Total Budgeted
      const { data: budgets, error: budgetsError } = await supabase
        .from("activity_budgets")
        .select("usd_value")
        .eq("activity_id", activityId);
      setTotalBudgeted(budgetsError ? 0 : budgets?.reduce((sum, row) => sum + (row.usd_value || 0), 0) || 0);

      // Planned Disbursements
      const { data: disb, error: disbError } = await supabase
        .from("planned_disbursements")
        .select("usd_amount")
        .eq("activity_id", activityId);
      setPlannedDisbursements(disbError ? 0 : disb?.reduce((sum, row) => sum + (row.usd_amount || 0), 0) || 0);

      // Transactions: Committed (type 2), Disbursed/Expended (type 3 or 4)
      const { data: txs, error: txsError } = await supabase
        .from("transactions")
        .select("transaction_type, value")
        .eq("activity_id", activityId);
      let committed = 0, disbursed = 0;
      if (!txsError && txs) {
        txs.forEach(t => {
          if (t.transaction_type === '2') committed += t.value || 0;
          if (t.transaction_type === '3' || t.transaction_type === '4') disbursed += t.value || 0;
        });
      }
      setTotalCommitted(committed);
      setTotalDisbursedAndExpended(disbursed);
    }
    if (activityId) fetchFinancials();
  }, [activityId]);

  const formatCurrency = (amount: number) => `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const cards = [
    {
      title: "Total Budgeted (USD)",
      subtitle: "Planned budget for the full activity lifecycle (USD)",
      value: totalBudgeted,
    },
    {
      title: "Planned Disbursements",
      subtitle: "Future disbursements scheduled but not yet made",
      value: plannedDisbursements,
    },
    {
      title: "Total Committed",
      subtitle: "Funds legally committed to partners or implementers",
      value: totalCommitted,
    },
    {
      title: "Total Disbursed & Expended",
      subtitle: "Funds transferred and spent by implementers",
      value: totalDisbursedAndExpended,
    },
  ];

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {cards.map((card, idx) => (
        <Card key={idx} className="bg-white border border-gray-200 rounded-lg">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(card.value)}</p>
              <p className="text-xs text-gray-500">{card.subtitle}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 