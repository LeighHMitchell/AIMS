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
  };
  sortField?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
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
  ]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
  };
} 