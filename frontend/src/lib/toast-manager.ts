import { toast } from 'sonner';
import { useEffect } from 'react';
import { humanizeFieldName } from '@/lib/utils';

// Global state to track active toasts and prevent duplicates
const activeToasts = new Set<string>();
const toastQueue = new Map<string, NodeJS.Timeout>();

// Toast configuration
const TOAST_CONFIG = {
  duration: 5000,
  position: 'top-center' as const,
  closeButton: true,
};

// Transaction-specific toast identifiers
export const TRANSACTION_TOAST_IDS = {
  SUBMIT_SUCCESS: 'transaction-submit-success',
  SUBMIT_ERROR: 'transaction-submit-error',
  VALIDATION_ERROR: 'transaction-validation-error',
  FIELD_SAVE: 'transaction-field-save',
  DUPLICATE_REFERENCE: 'transaction-duplicate-reference',
  AUTO_CREATE: 'transaction-auto-create',
} as const;

type ToastId = typeof TRANSACTION_TOAST_IDS[keyof typeof TRANSACTION_TOAST_IDS];

/**
 * Dismiss any active transaction-related toasts before showing a new one
 */
function dismissActiveToasts(excludeId?: ToastId) {
  activeToasts.forEach(id => {
    if (id !== excludeId) {
      toast.dismiss(id);
      activeToasts.delete(id);
    }
  });
  
  // Clear any queued toasts
  toastQueue.forEach((timeout, id) => {
    if (id !== excludeId) {
      clearTimeout(timeout);
      toastQueue.delete(id);
    }
  });
}

/**
 * Show a transaction success toast, dismissing any conflicting toasts
 */
export function showTransactionSuccess(message: string, options?: { 
  id?: ToastId;
  description?: string;
  dismissOthers?: boolean;
}) {
  const id = options?.id || TRANSACTION_TOAST_IDS.SUBMIT_SUCCESS;
  
  if (options?.dismissOthers !== false) {
    dismissActiveToasts(id);
  }
  
  // Don't show duplicate success messages
  if (activeToasts.has(id)) {
    return;
  }
  
  activeToasts.add(id);
  
  toast.success(message, {
    id,
    description: options?.description,
    ...TOAST_CONFIG,
    onDismiss: () => activeToasts.delete(id),
    onAutoClose: () => activeToasts.delete(id),
  });
}

/**
 * Show a transaction error toast, dismissing any conflicting toasts
 */
export function showTransactionError(message: string, options?: {
  id?: ToastId;
  description?: string;
  dismissOthers?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  const id = options?.id || TRANSACTION_TOAST_IDS.SUBMIT_ERROR;
  
  if (options?.dismissOthers !== false) {
    dismissActiveToasts(id);
  }
  
  // Don't show duplicate error messages
  if (activeToasts.has(id)) {
    return;
  }
  
  activeToasts.add(id);
  
  toast.error(message, {
    id,
    description: options?.description,
    action: options?.action,
    ...TOAST_CONFIG,
    onDismiss: () => activeToasts.delete(id),
    onAutoClose: () => activeToasts.delete(id),
  });
}

/**
 * Show a field-level save success (debounced to prevent spam)
 */
export function showFieldSaveSuccess(fieldName: string, options?: {
  debounceMs?: number;
  customMessage?: string;
}) {
  const id = `${TRANSACTION_TOAST_IDS.FIELD_SAVE}-${fieldName}`;
  const debounceMs = options?.debounceMs || 1000;
  
  // Clear any existing timeout for this field
  const existingTimeout = toastQueue.get(id);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }
  
  // Debounce the toast
  const timeout = setTimeout(() => {
    if (!activeToasts.has(TRANSACTION_TOAST_IDS.SUBMIT_SUCCESS) && 
        !activeToasts.has(TRANSACTION_TOAST_IDS.SUBMIT_ERROR)) {
      
      activeToasts.add(id);
      
      toast.success(options?.customMessage || `${humanizeFieldName(fieldName)} updated`, {
        id,
        duration: 2000, // Shorter duration for field updates
        position: 'top-center',
        onDismiss: () => activeToasts.delete(id),
        onAutoClose: () => activeToasts.delete(id),
      });
    }
    toastQueue.delete(id);
  }, debounceMs);
  
  toastQueue.set(id, timeout);
}

/**
 * Show validation error with suggestion for duplicate reference
 */
export function showValidationError(message: string, options?: {
  isDuplicateReference?: boolean;
  onClearReference?: () => void;
}) {
  const id = TRANSACTION_TOAST_IDS.VALIDATION_ERROR;
  
  dismissActiveToasts();
  activeToasts.add(id);
  
  const action = options?.isDuplicateReference && options?.onClearReference ? {
    label: 'Clear Reference',
    onClick: options.onClearReference,
  } : undefined;
  
  toast.error(message, {
    id,
    description: options?.isDuplicateReference 
      ? 'Click "Clear Reference" to auto-generate a unique reference, or provide a different one.'
      : undefined,
    action,
    ...TOAST_CONFIG,
    onDismiss: () => activeToasts.delete(id),
    onAutoClose: () => activeToasts.delete(id),
  });
}

/**
 * Show auto-creation success (less prominent)
 */
export function showAutoCreateSuccess(message: string) {
  const id = TRANSACTION_TOAST_IDS.AUTO_CREATE;
  
  // Don't show if there are other active toasts
  if (activeToasts.size > 0) {
    return;
  }
  
  activeToasts.add(id);
  
  toast.success(message, {
    id,
    duration: 3000,
    position: 'top-center',
    onDismiss: () => activeToasts.delete(id),
    onAutoClose: () => activeToasts.delete(id),
  });
}

/**
 * Clear all transaction-related toasts
 */
export function clearAllTransactionToasts() {
  dismissActiveToasts();
}

/**
 * Check if a specific toast is currently active
 */
export function isToastActive(id: ToastId): boolean {
  return activeToasts.has(id);
}

// ---------------------------------------------------------------------------
// Undo toast infrastructure (Gmail-style delayed delete)
// ---------------------------------------------------------------------------

export interface UndoToastOptions {
  id?: string;
  duration?: number;
  description?: string;
  /** Mode A: run at timeout/dismiss. If omitted, acts as Mode B (local-only). */
  commit?: () => Promise<void> | void;
  /** Restore UI if the user clicks Undo (or commit fails). */
  onUndo?: () => void;
  /** Called if commit throws. Receives the error. Caller should re-fetch / restore. */
  onCommitError?: (err: unknown) => void;
  /** Group id used by useFlushDeletesOnUnmount / flushPendingDeletes. */
  source?: string;
}

interface PendingDelete {
  commit: () => Promise<void> | void;
  onCommitError?: (err: unknown) => void;
  timer: ReturnType<typeof setTimeout> | null;
  source?: string;
  committed: boolean;
}

const pendingDeletes = new Map<string, PendingDelete>();
let beforeUnloadAttached = false;

function ensureBeforeUnload() {
  if (beforeUnloadAttached || typeof window === 'undefined') return;
  beforeUnloadAttached = true;
  window.addEventListener('beforeunload', () => {
    // Fire-and-forget every pending commit synchronously; fetch keepalive handles the network.
    pendingDeletes.forEach((p, id) => {
      if (p.committed) return;
      if (p.timer) clearTimeout(p.timer);
      p.committed = true;
      try {
        void p.commit();
      } catch {
        /* swallow */
      }
      pendingDeletes.delete(id);
    });
  });
}

async function runCommit(id: string, p: PendingDelete): Promise<void> {
  if (p.committed) return;
  p.committed = true;
  if (p.timer) {
    clearTimeout(p.timer);
    p.timer = null;
  }
  pendingDeletes.delete(id);
  try {
    await p.commit();
  } catch (err) {
    try {
      p.onCommitError?.(err);
    } catch {
      /* swallow */
    }
  }
}

/**
 * Show a success toast with a green Undo action button.
 *
 * Mode A (delayed delete): pass `commit`. The commit runs when the toast
 * auto-closes, is manually dismissed, the page unmounts, or the tab closes.
 * Clicking Undo cancels the commit and calls `onUndo` to restore UI.
 *
 * Mode B (local-only): omit `commit`. Clicking Undo calls `onUndo`;
 * otherwise nothing happens on auto-close.
 */
export function showUndoToast(
  message: string,
  opts: UndoToastOptions = {}
): { id: string; cancel: () => void; flush: () => Promise<void> } {
  const id = opts.id ?? `undo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const duration = opts.duration ?? 5000;

  // If an earlier pending delete had the same id, flush it first to avoid double-commit ambiguity.
  const existing = pendingDeletes.get(id);
  if (existing) {
    void runCommit(id, existing);
  }

  ensureBeforeUnload();

  let entry: PendingDelete | null = null;
  if (opts.commit) {
    entry = {
      commit: opts.commit,
      onCommitError: opts.onCommitError,
      timer: null,
      source: opts.source,
      committed: false,
    };
    pendingDeletes.set(id, entry);
    // Fire the commit on timeout unless Undo cancels it first.
    entry.timer = setTimeout(() => {
      const p = pendingDeletes.get(id);
      if (p && !p.committed) void runCommit(id, p);
    }, duration);
  }

  toast.success(message, {
    id,
    description: opts.description,
    duration,
    action: {
      label: 'Undo',
      onClick: () => {
        if (entry) {
          entry.committed = true;
          if (entry.timer) {
            clearTimeout(entry.timer);
            entry.timer = null;
          }
          pendingDeletes.delete(id);
        }
        try {
          opts.onUndo?.();
        } catch {
          /* swallow */
        }
        toast.dismiss(id);
      },
    },
  });

  return {
    id,
    cancel: () => {
      if (entry) {
        entry.committed = true;
        if (entry.timer) clearTimeout(entry.timer);
        pendingDeletes.delete(id);
      }
      toast.dismiss(id);
    },
    flush: async () => {
      if (entry) await runCommit(id, entry);
    },
  };
}

/**
 * Flush (commit) all pending deletes whose source matches, or all if omitted.
 * Called by <PendingDeletesFlusher /> on route change and by
 * useFlushDeletesOnUnmount on component unmount.
 */
export async function flushPendingDeletes(source?: string): Promise<void> {
  const ids: string[] = [];
  pendingDeletes.forEach((p, id) => {
    if (!source || p.source === source) ids.push(id);
  });
  await Promise.all(
    ids.map(id => {
      const p = pendingDeletes.get(id);
      return p ? runCommit(id, p) : Promise.resolve();
    }),
  );
}

export async function flushAllPendingDeletes(): Promise<void> {
  await flushPendingDeletes();
}

/**
 * React hook: flush all pending deletes tagged with `source` on unmount.
 * Call once at the top of any list/page that shows undo toasts.
 */
export function useFlushDeletesOnUnmount(source: string): void {
  useEffect(() => {
    return () => {
      void flushPendingDeletes(source);
    };
  }, [source]);
}