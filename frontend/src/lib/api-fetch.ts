/**
 * Centralized API fetch wrapper with credentials included.
 * This ensures cookies are sent with all API requests, fixing authentication
 * issues on corporate browsers (like Edge on Windows) that have stricter cookie policies.
 *
 * Also provides cancelAllReads() for prioritizing save operations over reads.
 */

import { requestQueue } from './request-queue';

// Track active read requests so they can be cancelled when saves happen
const activeReadRequests = new Map<string, AbortController>();

/**
 * Cancel all pending read (GET) requests.
 * Call this before making FIELD SAVE requests to prioritize writes over reads.
 * This should ONLY be called by the field autosave system, not for general API calls.
 */
export function cancelAllReads(): void {
  if (activeReadRequests.size > 0) {
    console.log(`[apiFetch] Cancelling ${activeReadRequests.size} pending read requests for save priority`);
    activeReadRequests.forEach((controller) => {
      controller.abort();
    });
    activeReadRequests.clear();
  }

  // Also cancel LOW priority requests in the queue
  requestQueue.cancelLowPriority();
}

/**
 * Fetch wrapper that ensures credentials are always included.
 * Use this instead of native fetch() for all API calls.
 *
 * GET requests are tracked and can be cancelled by cancelAllReads().
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const { headers, body, signal, ...restOptions } = options;
  const method = (options.method || 'GET').toUpperCase();
  const isReadRequest = method === 'GET';

  // Don't set Content-Type for FormData - browser will set it automatically with boundary
  const isFormData = body instanceof FormData;

  const finalHeaders: HeadersInit = isFormData
    ? (headers instanceof Headers
        ? Object.fromEntries(headers.entries())
        : (headers || {}))
    : {
        'Content-Type': 'application/json',
        ...(headers instanceof Headers
          ? Object.fromEntries(headers.entries())
          : headers),
      };

  // For read requests, create an abort controller so they can be cancelled by saves
  if (isReadRequest) {
    const abortController = new AbortController();
    const requestKey = `${url}-${Date.now()}`; // Unique key per request
    activeReadRequests.set(requestKey, abortController);

    // Combine with any existing signal
    const combinedSignal = signal
      ? combineAbortSignals(signal, abortController.signal)
      : abortController.signal;

    try {
      const response = await fetch(url, {
        ...restOptions,
        method,
        body,
        credentials: 'include',
        headers: finalHeaders,
        signal: combinedSignal,
      });
      return response;
    } finally {
      activeReadRequests.delete(requestKey);
    }
  }

  // For write requests, execute directly (don't auto-cancel reads)
  return fetch(url, {
    ...restOptions,
    method,
    body,
    credentials: 'include',
    headers: finalHeaders,
    signal,
  });
}

/**
 * Combine multiple abort signals into one
 */
function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
}

/**
 * Fetch wrapper that returns JSON data directly.
 * Throws an error if the response is not OK.
 */
export async function apiFetchJson<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

/**
 * POST helper for JSON APIs
 */
export async function apiPost<T = unknown>(
  url: string,
  data: unknown,
  options: RequestInit = {}
): Promise<T> {
  return apiFetchJson<T>(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUT helper for JSON APIs
 */
export async function apiPut<T = unknown>(
  url: string,
  data: unknown,
  options: RequestInit = {}
): Promise<T> {
  return apiFetchJson<T>(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * PATCH helper for JSON APIs
 */
export async function apiPatch<T = unknown>(
  url: string,
  data: unknown,
  options: RequestInit = {}
): Promise<T> {
  return apiFetchJson<T>(url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE helper for JSON APIs
 */
export async function apiDelete<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  return apiFetchJson<T>(url, {
    ...options,
    method: 'DELETE',
  });
}
