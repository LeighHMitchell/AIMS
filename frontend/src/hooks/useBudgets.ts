import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Budget, BudgetFilter, BudgetResponse } from "@/types/budget";

interface BudgetHookParams {
  searchQuery?: string;
  filters?: BudgetFilter;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export function useBudgets(params: BudgetHookParams = {}) {
  const [budgets, setBudgets] = useState<BudgetResponse>({
    budgets: [],
    total: 0,
    page: 1,
    limit: 20,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = async () => {
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
          if (Array.isArray(value)) {
            // Handle array filters - join with comma
            if (value.length > 0) {
              queryParams.append(key, value.join(','));
            }
          } else if (value && value !== "all" && value !== "") {
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

      const response = await fetch(`/api/budgets/list?${queryParams.toString()}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch budgets: ${response.status}`);
      }

      const data = await response.json();
      
      // Ensure response has correct structure
      if (data.budgets && Array.isArray(data.budgets)) {
        setBudgets(data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("[AIMS] Error fetching budgets:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load budgets";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [
    params.searchQuery,
    params.filters,
    params.sortField,
    params.sortOrder,
    params.page,
    params.limit,
  ]);

  // Optimistic delete function
  const deleteBudget = (budgetId: string) => {
    setBudgets(prev => ({
      ...prev,
      budgets: prev.budgets.filter(b => b.id !== budgetId),
      total: prev.total - 1
    }));
  };

  // Add back deleted budget (for error recovery)
  const addBudget = (budget: Budget) => {
    setBudgets(prev => ({
      ...prev,
      budgets: [budget, ...prev.budgets],
      total: prev.total + 1
    }));
  };

  return {
    budgets,
    loading,
    error,
    refetch: fetchBudgets,
    deleteBudget,
    addBudget,
  };
}

