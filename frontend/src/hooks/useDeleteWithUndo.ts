import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';

export type DeleteRequest = {
  endpoint: string;
  method?: 'DELETE';
  body?: unknown;
};

export type RunDeleteOptions = {
  id: string;
  request: DeleteRequest;
  label?: string;
  optimisticRemove: () => void;
  restore: () => void;
  onCommit?: () => void | Promise<void>;
  windowMs?: number;
};

export function useDeleteWithUndo() {
  const pending = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      pending.current.forEach((timer) => clearTimeout(timer));
      pending.current.clear();
    };
  }, []);

  return useCallback(
    ({
      id,
      request,
      label,
      optimisticRemove,
      restore,
      onCommit,
      windowMs = 7000,
    }: RunDeleteOptions) => {
      optimisticRemove();

      const existing = pending.current.get(id);
      if (existing) clearTimeout(existing);

      const commit = async () => {
        pending.current.delete(id);
        try {
          const init: RequestInit = { method: request.method ?? 'DELETE' };
          if (request.body !== undefined) {
            init.headers = { 'Content-Type': 'application/json' };
            init.body = JSON.stringify(request.body);
          }
          const response = await apiFetch(request.endpoint, init);
          if (!response.ok) {
            let message = 'Failed to delete';
            try {
              const err = await response.json();
              message = err.error || err.message || message;
            } catch {
              /* ignore */
            }
            restore();
            toast.error(message);
            return;
          }
          if (onCommit) await onCommit();
        } catch (err) {
          restore();
          toast.error(err instanceof Error ? err.message : 'Failed to delete');
        }
      };

      const timer = setTimeout(commit, windowMs);
      pending.current.set(id, timer);

      toast.success(label ? `Removed ${label}` : 'Removed', {
        duration: windowMs,
        action: {
          label: 'Undo',
          onClick: () => {
            const t = pending.current.get(id);
            if (t) {
              clearTimeout(t);
              pending.current.delete(id);
            }
            restore();
          },
        },
      });
    },
    [],
  );
}
