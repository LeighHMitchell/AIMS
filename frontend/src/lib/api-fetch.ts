/**
 * Centralized API fetch wrapper with credentials included.
 * This ensures cookies are sent with all API requests, fixing authentication
 * issues on corporate browsers (like Edge on Windows) that have stricter cookie policies.
 */

/**
 * Fetch wrapper that ensures credentials are always included.
 * Use this instead of native fetch() for all API calls.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const { headers, body, ...restOptions } = options;
  
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
  
  return fetch(url, {
    ...restOptions,
    body,
    credentials: 'include',
    headers: finalHeaders,
  });
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
