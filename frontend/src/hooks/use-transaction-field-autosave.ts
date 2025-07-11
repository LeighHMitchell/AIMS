import { useState, useCallback } from 'react';

interface TransactionFieldAutosaveOptions {
  transactionId: string;
  fieldName: string;
  userId?: string;
  initialValue?: any;
  debounceMs?: number;
}

export function useTransactionFieldAutosave({
  transactionId,
  fieldName,
  userId,
  initialValue,
  debounceMs = 1000
}: TransactionFieldAutosaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(!!initialValue);
  const [error, setError] = useState<string | null>(null);

  // Debounced save
  const triggerFieldSave = useCallback(async (value: any) => {
    setIsSaving(true);
    setError(null);
    setIsSaved(false);
    try {
      const res = await fetch(`/api/data-clinic/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: fieldName, value, userId })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save');
        setIsSaving(false);
        setIsSaved(false);
        return;
      }
      setIsSaving(false);
      setIsSaved(true);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
      setIsSaving(false);
      setIsSaved(false);
    }
  }, [transactionId, fieldName, userId]);

  return {
    isSaving,
    isSaved,
    error,
    triggerFieldSave
  };
} 