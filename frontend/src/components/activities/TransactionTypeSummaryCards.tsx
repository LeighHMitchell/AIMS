"use client";

import React, { useEffect, useMemo, useState } from "react";
import { HeroCard } from "@/components/ui/hero-card";
import { Transaction, TRANSACTION_TYPE_LABELS_PLURAL, TransactionType } from '@/types/transaction';
import { StaggerContainer, StaggerItem } from "@/components/ui/stagger";
import { getTransactionUSDValueSync } from "@/lib/transaction-usd-helper";
import { fixedCurrencyConverter } from "@/lib/currency-converter-fixed";

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
  const [convertedUsd, setConvertedUsd] = useState<Record<string, number>>({});

  // Convert any transactions that don't have a stored USD value (mirrors TransactionList behaviour).
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const updates: Record<string, number> = {};
      for (const t of transactions) {
        const id = (t as any).uuid || (t as any).id;
        if (!id) continue;
        if (getTransactionUSDValueSync(t) > 0) continue;
        if (!t.value || !t.currency || !t.transaction_date) continue;
        try {
          const result = await fixedCurrencyConverter.convertToUSD(
            Number(t.value),
            t.currency,
            new Date(t.transaction_date)
          );
          if (result?.usd_amount != null) {
            updates[id] = result.usd_amount;
          }
        } catch {
          // ignore — falls back to 0
        }
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setConvertedUsd(prev => ({ ...prev, ...updates }));
      }
    }
    if (transactions.length > 0) run();
    return () => { cancelled = true; };
  }, [transactions]);

  // Calculate summaries by transaction type
  const transactionTypeSummaries = useMemo(() => {
    const summaryMap = new Map<string, TransactionTypeSummary>();

    transactions.forEach(transaction => {
      const type = transaction.transaction_type || '';
      const typeName = TRANSACTION_TYPE_LABELS_PLURAL[type as TransactionType] || 'Unknown';
      const id = (transaction as any).uuid || (transaction as any).id;
      const stored = getTransactionUSDValueSync(transaction);
      const usdValue = stored > 0 ? stored : (id && convertedUsd[id]) || 0;

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
  }, [transactions, convertedUsd]);

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
              value={`US$${summary.totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
              subtitle={`${summary.count} transaction${summary.count === 1 ? '' : 's'}`}
            />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}
