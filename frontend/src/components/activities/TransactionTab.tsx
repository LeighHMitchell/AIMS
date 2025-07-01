"use client"

import React, { useState, useEffect } from 'react';
import { Transaction, TransactionFormData } from '@/types/transaction';
import TransactionList from './TransactionList';
import { toast } from 'sonner';

interface TransactionTabProps {
  activityId: string;
  readOnly?: boolean;
}

export default function TransactionTab({ activityId, readOnly = false }: TransactionTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch transactions
  useEffect(() => {
    fetchTransactions();
    fetchOrganizations();
  }, [activityId]);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/activities/${activityId}/transactions`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      console.log('[TransactionTab] Fetched transactions:', data);
      setTransactions(data);
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

  const handleAddTransaction = async (data: TransactionFormData) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          activity_id: activityId
        })
      });

      if (!response.ok) throw new Error('Failed to add transaction');
      
      const newTransaction = await response.json();
      setTransactions(prev => [...prev, newTransaction]);
      
      toast.success("Transaction added successfully");
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error("Failed to add transaction");
      throw error;
    }
  };

  const handleUpdateTransaction = async (id: string, data: TransactionFormData) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to update transaction');
      
      const updatedTransaction = await response.json();
      setTransactions(prev => 
        prev.map(t => t.id === id ? updatedTransaction : t)
      );
      
      toast.success("Transaction updated successfully");
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error("Failed to update transaction");
      throw error;
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/transactions/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete transaction');
      
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      toast.success("Transaction deleted successfully");
    } catch (error) {
      console.error('Error deleting transaction:', error);
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
      readOnly={readOnly}
    />
  );
} 