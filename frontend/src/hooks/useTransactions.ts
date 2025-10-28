import { useState, useEffect } from "react";
import { toast } from "sonner";

interface TransactionFilter {
  searchQuery?: string;
  filters?: {
    transactionType: string;
    aidType: string;
    flowType: string;
    financeType: string;
    organization: string;
    dateFrom: string;
    dateTo: string;
    status: string;
    transactionSource?: string;
  };
  sortField?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  includeLinked?: boolean;
}

interface TransactionResponse {
  data: any[];
  total: number;
  page: number;
  limit: number;
}

export function useTransactions(params: TransactionFilter = {}) {
  const [transactions, setTransactions] = useState<TransactionResponse>({
    data: [],
    total: 0,
    page: 1,
    limit: 20,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const queryParams = new URLSearchParams();
      
      if (params.searchQuery) {
        queryParams.append("search", params.searchQuery);
      }
      
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value && value !== "all" && value !== "") {
            queryParams.append(key, value);
          }
        });
      }
      
      if (params.sortField) {
        queryParams.append("sortField", params.sortField);
      }
      
      if (params.sortOrder) {
        queryParams.append("sortOrder", params.sortOrder);
      }
      
      if (params.page) {
        queryParams.append("page", params.page.toString());
      }
      
      if (params.limit) {
        queryParams.append("limit", params.limit.toString());
      }
      
      if (params.includeLinked !== undefined) {
        queryParams.append("includeLinked", params.includeLinked.toString());
      }

      const response = await fetch(`/api/transactions?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response has pagination structure
      if (data.data && Array.isArray(data.data)) {
        setTransactions(data);
      } else if (Array.isArray(data)) {
        // Fallback for non-paginated response
        setTransactions({
          data: data,
          total: data.length,
          page: 1,
          limit: data.length,
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("[AIMS] Error fetching transactions:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load transactions";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [
    params.searchQuery,
    params.filters,
    params.sortField,
    params.sortOrder,
    params.page,
    params.limit,
    params.includeLinked,
  ]);

  // Optimistic delete function
  const deleteTransaction = (transactionId: string) => {
    setTransactions(prev => ({
      ...prev,
      data: prev.data.filter(t => (t.uuid || t.id) !== transactionId),
      total: prev.total - 1
    }));
  };

  // Add back deleted transaction (for error recovery)
  const addTransaction = (transaction: any) => {
    setTransactions(prev => ({
      ...prev,
      data: [transaction, ...prev.data],
      total: prev.total + 1
    }));
  };

  // Accept linked transaction
  const acceptTransaction = async (transactionId: string, acceptingActivityId: string, acceptingUserId?: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acceptingActivityId,
          acceptingUserId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept transaction');
      }

      const result = await response.json();
      
      // Update transactions list - remove linked transaction and add accepted copy if it belongs to current view
      setTransactions(prev => ({
        ...prev,
        data: prev.data.map(t => 
          (t.uuid || t.id) === transactionId 
            ? { ...t, acceptance_status: 'accepted' }
            : t
        )
      }));

      toast.success('Transaction accepted successfully');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept transaction';
      toast.error(errorMessage);
      throw error;
    }
  };

  // Reject linked transaction
  const rejectTransaction = async (transactionId: string, rejectingUserId?: string, rejectionReason?: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectingUserId,
          rejectionReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject transaction');
      }

      const result = await response.json();
      
      // Update transactions list - mark as rejected
      setTransactions(prev => ({
        ...prev,
        data: prev.data.map(t => 
          (t.uuid || t.id) === transactionId 
            ? { ...t, acceptance_status: 'rejected' }
            : t
        )
      }));

      toast.success('Transaction rejected successfully');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject transaction';
      toast.error(errorMessage);
      throw error;
    }
  };

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
    deleteTransaction,
    addTransaction,
    acceptTransaction,
    rejectTransaction,
  };
} 