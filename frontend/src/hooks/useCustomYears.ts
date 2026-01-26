import { useState, useEffect, useCallback } from "react";
import { CustomYear } from "@/types/custom-years";
import { apiFetch } from '@/lib/api-fetch';

interface UseCustomYearsResult {
  /** All active custom years */
  customYears: CustomYear[];
  /** Currently selected custom year ID */
  selectedId: string | null;
  /** Update the selected custom year ID */
  setSelectedId: (id: string | null) => void;
  /** Full custom year object for the selectedId */
  selectedYear: CustomYear | null;
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refetch the custom years */
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching and managing custom year selection.
 * Fetches active custom years and auto-selects the system default.
 * Can be reused by any chart component that needs fiscal year selection.
 */
export function useCustomYears(): UseCustomYearsResult {
  const [customYears, setCustomYears] = useState<CustomYear[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchCustomYears = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch("/api/custom-years");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch custom years");
      }

      setCustomYears(result.data || []);

      // Auto-select the system default on first load
      if (!initialized && result.defaultId) {
        setSelectedId(result.defaultId);
      }
      setInitialized(true);
    } catch (err: any) {
      console.error("[useCustomYears] Error:", err);
      setError(err.message || "Failed to load custom years");
      setCustomYears([]);
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  useEffect(() => {
    fetchCustomYears();
  }, [fetchCustomYears]);

  // Get the full custom year object for the selected ID
  const selectedYear = selectedId
    ? customYears.find((cy) => cy.id === selectedId) || null
    : null;

  return {
    customYears,
    selectedId,
    setSelectedId,
    selectedYear,
    loading,
    error,
    refetch: fetchCustomYears,
  };
}
