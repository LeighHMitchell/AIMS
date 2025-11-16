"use client";

import React, { useMemo } from "react";
import { HeroCard } from "@/components/ui/hero-card";
import { Transaction, TRANSACTION_TYPE_LABELS } from '@/types/transaction';
import { DollarSign, Hash } from "lucide-react";

interface TransactionTypeSummaryCardsProps {
  transactions: Transaction[];
  className?: string;
}

interface TransactionTypeSummary {
  type: string;
  typeName: string;
  count: number;
  totalUsd: number;
}

export function TransactionTypeSummaryCards({
  transactions,
  className
}: TransactionTypeSummaryCardsProps) {

  // Calculate summaries by transaction type
  const transactionTypeSummaries = useMemo(() => {
    const summaryMap = new Map<string, TransactionTypeSummary>();

    transactions.forEach(transaction => {
      const type = transaction.transaction_type || '';
      const typeName = TRANSACTION_TYPE_LABELS[type] || 'Unknown';
      const usdValue = transaction.usd_value || 0;

      if (!summaryMap.has(type)) {
        summaryMap.set(type, {
          type,
          typeName,
          count: 0,
          totalUsd: 0
        });
      }

      const summary = summaryMap.get(type)!;
      summary.count++;
      summary.totalUsd += usdValue;
    });

    // Convert to array and sort by total USD value descending
    return Array.from(summaryMap.values())
      .sort((a, b) => b.totalUsd - a.totalUsd);
  }, [transactions]);

  if (transactionTypeSummaries.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {transactionTypeSummaries.map((summary) => (
          <HeroCard
            key={summary.type}
            title={summary.typeName}
            items={[
              {
                label: "Total Value (USD)",
                value: `$${summary.totalUsd.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`,
                icon: DollarSign,
                iconClassName: "text-green-600"
              },
              {
                label: "Count",
                value: summary.count.toString(),
                icon: Hash,
                iconClassName: "text-blue-600"
              }
            ]}
          />
        ))}
      </div>
    </div>
  );
}
