"use client";

import React, { useMemo } from "react";
import { HeroCard } from "@/components/ui/hero-card";
import { Transaction, TRANSACTION_TYPE_LABELS } from '@/types/transaction';
import { DollarSign, Hash } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/ui/stagger";

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
      const usdValue = transaction.value_usd
        || (transaction.currency === 'USD' && transaction.value ? Number(transaction.value) : 0)
        || 0;

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

    // Sort by preferred order: Incoming Funds, Outgoing Commitment, Disbursement, Expenditure, then rest
    const typeOrder: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
    return Array.from(summaryMap.values())
      .sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99));
  }, [transactions]);

  if (transactionTypeSummaries.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {transactionTypeSummaries.map((summary) => (
          <StaggerItem key={summary.type}>
          <HeroCard
            title={summary.typeName}
            items={[
              {
                label: "Total Value (USD)",
                value: `$${summary.totalUsd.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`,
                icon: DollarSign,
                iconClassName: "text-[hsl(var(--success-icon))]"
              },
              {
                label: "Count",
                value: summary.count.toString(),
                icon: Hash,
                iconClassName: "text-blue-600"
              }
            ]}
          />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}
