"use client"

import React, { useState, useEffect } from 'react';
import { Transaction, TransactionFormData } from '@/types/transaction';
import TransactionList from './TransactionList';
import { toast } from 'sonner';
import { showUndoToast, useFlushDeletesOnUnmount } from '@/lib/toast-manager';
import { apiFetch } from '@/lib/api-fetch';
import { Skeleton } from '@/components/ui/skeleton';

interface TransactionTabProps {
  activityId: string;
  readOnly?: boolean;
  defaultFinanceType?: string;
  defaultAidType?: string;
  defaultCurrency?: string;
  defaultTiedStatus?: string;
  defaultFlowType?: string;
  onTransactionsChange?: (transactions: Transaction[]) => void;
  hideSummaryCards?: boolean;
  hideHeaderTitle?: boolean;
  renderFilters?: (filters: React.ReactNode) => React.ReactPortal | null;
  onLoadingChange?: (loading: boolean) => void;
}

export default function TransactionTab({
  activityId,
  readOnly = false,
  defaultFinanceType,
  defaultAidType,
  defaultCurrency = 'USD',
  defaultTiedStatus,
  defaultFlowType,
  onTransactionsChange,
  hideSummaryCards = false,
  hideHeaderTitle = false,
  renderFilters,
  onLoadingChange
}: TransactionTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useFlushDeletesOnUnmount(`activity-transactions-${activityId}`);
  
  // Track last notified transaction count to prevent infinite loops
  const lastNotifiedCountRef = React.useRef<number>(-1);

  // Fetch transactions and reset notification tracking
  useEffect(() => {
    lastNotifiedCountRef.current = -1; // Reset notification tracking for new activity
    setIsLoading(true);
    onLoadingChange?.(true);
    fetchTransactions();
    fetchOrganizations();
  }, [activityId]);

  const fetchTransactions = async () => {
    try {
      const response = await apiFetch(`/api/activities/${activityId}/transactions`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      // Filter out transactions without a valid uuid
      const validTransactions = data.filter((t: any) => {
        const hasValidUuid = t.uuid;
        if (!hasValidUuid) {
          console.warn('[TransactionTab] Transaction without valid UUID found:', t);
        }
        return hasValidUuid;
      });
      
      setTransactions(validTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error("Failed to load transactions");
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await apiFetch('/api/organizations');
      if (!response.ok) throw new Error('Failed to fetch organizations');
      const data = await response.json();
      setOrganizations(data);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  // Notify parent component when transactions change (only after initial load)
  useEffect(() => {
    // Only notify parent after initial data load is complete
    // This prevents the green tick from disappearing when switching tabs
    console.log('[TransactionTab] useEffect - Checking notification conditions:', {
      hasCallback: !!onTransactionsChange,
      isLoading,
      transactionsCount: transactions.length,
      lastNotifiedCount: lastNotifiedCountRef.current
    });
    
    // Only notify if:
    // 1. We have a callback
    // 2. We're not loading
    // 3. The transaction count has actually changed since last notification
    if (onTransactionsChange && !isLoading && lastNotifiedCountRef.current !== transactions.length) {
      lastNotifiedCountRef.current = transactions.length;
      onTransactionsChange(transactions);
    } else {
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, isLoading]); // Intentionally exclude onTransactionsChange to prevent infinite loops

  const handleAddTransaction = async (data: TransactionFormData) => {
    try {
      // Validate required fields before sending
      if (!data.transaction_type) {
        toast.error("Transaction type is required");
        throw new Error("Transaction type is required");
      }
      if (!data.value || data.value <= 0) {
        toast.error("Transaction value must be greater than 0");
        throw new Error("Transaction value must be greater than 0");
      }
      if (!data.transaction_date) {
        toast.error("Transaction date is required");
        throw new Error("Transaction date is required");
      }
      if (!data.currency) {
        toast.error("Currency is required");
        throw new Error("Currency is required");
      }
      
      const response = await apiFetch(`/api/activities/${activityId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          activity_id: activityId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.details || errorData.error || 'Failed to add transaction';
        console.error('[TransactionTab] Server error:', errorData);
        throw new Error(errorMessage);
      }
      
      const newTransaction = await response.json();
      
      // Refresh the entire transaction list to ensure we have the latest data
      await fetchTransactions();
      
      toast.success("Transaction added successfully");
    } catch (error: any) {
      console.error('Error adding transaction:', error);
      toast.error(error.message || "Failed to add transaction");
      throw error;
    }
  };

  const handleUpdateTransaction = async (uuid: string, data: TransactionFormData) => {
    try {
      // Validate required fields before sending
      if (!data.transaction_type) {
        toast.error("Transaction type is required");
        throw new Error("Transaction type is required");
      }
      if (!data.value || data.value <= 0) {
        toast.error("Transaction value must be greater than 0");
        throw new Error("Transaction value must be greater than 0");
      }
      if (!data.transaction_date) {
        toast.error("Transaction date is required");
        throw new Error("Transaction date is required");
      }
      if (!data.currency) {
        toast.error("Currency is required");
        throw new Error("Currency is required");
      }
      
      const response = await apiFetch(`/api/activities/${activityId}/transactions/${uuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.details || errorData.error || 'Failed to update transaction';
        console.error('[TransactionTab] Server error:', errorData);
        throw new Error(errorMessage);
      }
      
      const updatedTransaction = await response.json();
      
      // Refresh the entire transaction list to ensure we have the latest data
      await fetchTransactions();
      
      toast.success("Transaction updated successfully");
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      toast.error(error.message || "Failed to update transaction");
      throw error;
    }
  };

  const handleDeleteTransaction = async (uuid: string) => {
    if (!uuid || uuid === 'undefined') {
      toast.error("Invalid transaction UUID for deletion.");
      console.error('[TransactionTab] Attempted to delete transaction with invalid UUID:', uuid);
      return;
    }

    const deletedIndex = transactions.findIndex(t => (t.uuid || t.id) === uuid);
    if (deletedIndex < 0) return;
    const deletedTransaction = transactions[deletedIndex];

    setTransactions(prev => prev.filter(t => (t.uuid || t.id) !== uuid));

    showUndoToast("Transaction deleted", {
      id: `delete-transaction-${uuid}`,
      source: `activity-transactions-${activityId}`,
      commit: async () => {
        const response = await apiFetch(`/api/activities/${activityId}/transactions/${uuid}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          let errorMessage = 'Failed to delete transaction';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {}
          throw new Error(errorMessage);
        }
        await fetchTransactions();
      },
      onUndo: () => {
        setTransactions(prev => {
          const restored = [...prev];
          restored.splice(Math.min(deletedIndex, restored.length), 0, deletedTransaction);
          return restored;
        });
      },
      onCommitError: (err) => {
        console.error('[TransactionTab] Error deleting transaction:', err);
        setTransactions(prev => {
          if (prev.some(t => (t.uuid || t.id) === uuid)) return prev;
          const restored = [...prev];
          restored.splice(Math.min(deletedIndex, restored.length), 0, deletedTransaction);
          return restored;
        });
        toast.error(err instanceof Error ? err.message : "Failed to delete transaction");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Hero card placeholders */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-6 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        {/* Table placeholder */}
        <div className="rounded-md border">
          <div className="border-b border-border/40 px-4 py-3 flex gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="border-b border-border/40 px-4 py-4 flex items-center gap-6">
              {[1, 2, 3, 4, 5, 6].map((c) => (
                <Skeleton key={c} className="h-4 w-20" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <TransactionList
      transactions={transactions}
      organizations={organizations}
      activityId={activityId}
      onAdd={handleAddTransaction}
      onUpdate={handleUpdateTransaction}
      onDelete={handleDeleteTransaction}
      onRefresh={fetchTransactions}
      readOnly={readOnly}
      currency={defaultCurrency}
      defaultFinanceType={defaultFinanceType}
      defaultAidType={defaultAidType}
      defaultTiedStatus={defaultTiedStatus}
      defaultFlowType={defaultFlowType}
      hideSummaryCards={hideSummaryCards}
      hideHeaderTitle={hideHeaderTitle}
      renderFilters={renderFilters}
    />
  );
} 