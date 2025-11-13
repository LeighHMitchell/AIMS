"use client"

import React, { useState, useEffect } from 'react';
import { Transaction, TransactionFormData } from '@/types/transaction';
import TransactionList from './TransactionList';
import { toast } from 'sonner';

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
  renderFilters?: (filters: React.ReactNode) => React.ReactPortal | null;
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
  renderFilters
}: TransactionTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Track last notified transaction count to prevent infinite loops
  const lastNotifiedCountRef = React.useRef<number>(-1);

  // Fetch transactions and reset notification tracking
  useEffect(() => {
    lastNotifiedCountRef.current = -1; // Reset notification tracking for new activity
    fetchTransactions();
    fetchOrganizations();
  }, [activityId]);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/activities/${activityId}/transactions`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      console.log('[TransactionTab] Fetched transactions:', data);
      // Filter out transactions without a valid uuid
      const validTransactions = data.filter((t: any) => {
        const hasValidUuid = t.uuid;
        if (!hasValidUuid) {
          console.warn('[TransactionTab] Transaction without valid UUID found:', t);
        }
        return hasValidUuid;
      });
      
      console.log('[TransactionTab] Valid transactions:', validTransactions);
      setTransactions(validTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error("Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations');
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
      console.log('[TransactionTab] Notifying parent with transactions:', transactions.length);
      lastNotifiedCountRef.current = transactions.length;
      onTransactionsChange(transactions);
    } else {
      console.log('[TransactionTab] NOT notifying parent - isLoading:', isLoading, 'or count unchanged');
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
      
      const response = await fetch(`/api/activities/${activityId}/transactions`, {
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
      
      const response = await fetch(`/api/activities/${activityId}/transactions/${uuid}`, {
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
    console.log('[TransactionTab] Deleting transaction with UUID:', uuid, 'Type:', typeof uuid);
    if (!uuid || uuid === 'undefined') {
      toast.error("Invalid transaction UUID for deletion.");
      console.error('[TransactionTab] Attempted to delete transaction with invalid UUID:', uuid);
      return;
    }
    try {
      const response = await fetch(`/api/activities/${activityId}/transactions/${uuid}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete transaction');
      
      // Refresh the entire transaction list to ensure we have the latest data
      await fetchTransactions();
      
      toast.success("Transaction deleted successfully");
    } catch (error) {
      console.error('[TransactionTab] Error deleting transaction:', error);
      toast.error("Failed to delete transaction");
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading transactions...</p>
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
      renderFilters={renderFilters}
    />
  );
} 