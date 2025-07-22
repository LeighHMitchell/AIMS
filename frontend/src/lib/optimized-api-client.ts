import { createClient } from '@supabase/supabase-js';

// Request deduplication cache
const pendingRequests = new Map<string, Promise<any>>();

// Response cache
const responseCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Connection pool for concurrent requests
const connectionPool = new Map<string, AbortController>();

interface ApiClientOptions {
  baseURL?: string;
  defaultTTL?: number; // Time to live for cached responses in milliseconds
  maxConcurrentRequests?: number;
  enableDeduplication?: boolean;
  enableCaching?: boolean;
}

export class OptimizedApiClient {
  private supabase: any;
  private options: Required<ApiClientOptions>;
  private activeRequests = 0;
  private maxConcurrentRequests: number;

  constructor(supabaseUrl: string, supabaseKey: string, options: ApiClientOptions = {}) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.options = {
      baseURL: options.baseURL || '',
      defaultTTL: options.defaultTTL || 5 * 60 * 1000, // 5 minutes
      maxConcurrentRequests: options.maxConcurrentRequests || 10,
      enableDeduplication: options.enableDeduplication ?? true,
      enableCaching: options.enableCaching ?? true,
    };
    this.maxConcurrentRequests = this.options.maxConcurrentRequests;
  }

  // Generate cache key from request parameters
  private generateCacheKey(endpoint: string, params: any): string {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  // Check if response is cached and not expired
  private getCachedResponse(cacheKey: string): any | null {
    if (!this.options.enableCaching) return null;

    const cached = responseCache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      responseCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  // Cache response
  private cacheResponse(cacheKey: string, data: any, ttl?: number): void {
    if (!this.options.enableCaching) return;

    responseCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.options.defaultTTL,
    });
  }

  // Clean up expired cache entries
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    responseCache.forEach((value, key) => {
      if (now - value.timestamp > value.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => responseCache.delete(key));
  }

  // Wait for available connection slot
  private async waitForConnection(): Promise<void> {
    while (this.activeRequests >= this.maxConcurrentRequests) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  // Make optimized request with deduplication and caching
  async request<T = any>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      params?: any;
      body?: any;
      ttl?: number;
      signal?: AbortSignal;
    } = {}
  ): Promise<T> {
    const { method = 'GET', params, body, ttl, signal } = options;
    const cacheKey = this.generateCacheKey(endpoint, { method, params, body });

    // Check cache for GET requests
    if (method === 'GET') {
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check for pending request (deduplication)
    if (this.options.enableDeduplication && pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey)!;
    }

    // Wait for available connection
    await this.waitForConnection();

    // Create request promise
    const requestPromise = this.executeRequest<T>(endpoint, {
      method,
      params,
      body,
      signal,
    }).then(async (response) => {
      // Cache successful GET responses
      if (method === 'GET') {
        this.cacheResponse(cacheKey, response, ttl);
      }

      // Clean up
      pendingRequests.delete(cacheKey);
      this.activeRequests--;

      return response;
    }).catch((error) => {
      // Clean up on error
      pendingRequests.delete(cacheKey);
      this.activeRequests--;
      throw error;
    });

    // Store pending request for deduplication
    if (this.options.enableDeduplication) {
      pendingRequests.set(cacheKey, requestPromise);
    }

    this.activeRequests++;
    return requestPromise;
  }

  // Execute the actual request
  private async executeRequest<T>(
    endpoint: string,
    options: {
      method: string;
      params?: any;
      body?: any;
      signal?: AbortSignal;
    }
  ): Promise<T> {
    const { method, params, body, signal } = options;

    try {
      let query = this.supabase.from(endpoint);

      // Apply filters for GET requests
      if (method === 'GET' && params) {
        if (params.filters) {
          Object.entries(params.filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              query = query.eq(key, value);
            }
          });
        }

        if (params.range) {
          query = query.range(params.range.from, params.range.to);
        }

        if (params.orderBy) {
          query = query.order(params.orderBy.column, {
            ascending: params.orderBy.ascending ?? true,
          });
        }

        if (params.select) {
          query = query.select(params.select);
        }
      }

      let result;
      switch (method) {
        case 'GET':
          result = await query;
          break;
        case 'POST':
          result = await this.supabase.from(endpoint).insert(body);
          break;
        case 'PUT':
          result = await this.supabase.from(endpoint).upsert(body);
          break;
        case 'PATCH':
          result = await this.supabase.from(endpoint).update(body).eq('id', params?.id);
          break;
        case 'DELETE':
          result = await this.supabase.from(endpoint).delete().eq('id', params?.id);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.data;
    } catch (error: any) {
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }
      throw error;
    }
  }

  // Optimized list fetching with pagination
  async fetchList<T = any>(
    endpoint: string,
    options: {
      page?: number;
      pageSize?: number;
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      select?: string;
      ttl?: number;
    } = {}
  ): Promise<{ data: T[]; total: number; hasMore: boolean }> {
    const { page = 1, pageSize = 20, filters, orderBy, select, ttl } = options;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const result = await this.request(endpoint, {
      method: 'GET',
      params: {
        filters,
        range: { from, to },
        orderBy,
        select,
      },
      ttl,
    });

    // Get total count for pagination info
    const countResult = await this.supabase
      .from(endpoint)
      .select('*', { count: 'exact', head: true });

    const total = countResult.count || 0;
    const hasMore = from + pageSize < total;

    return {
      data: result,
      total,
      hasMore,
    };
  }

  // Clear cache for specific endpoint or all
  clearCache(endpoint?: string): void {
    if (endpoint) {
      const keysToDelete: string[] = [];
      responseCache.forEach((_, key) => {
        if (key.startsWith(endpoint)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => responseCache.delete(key));
    } else {
      responseCache.clear();
    }
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: responseCache.size,
      keys: Array.from(responseCache.keys()),
    };
  }

  // Clean up expired cache entries
  cleanup(): void {
    this.cleanupCache();
  }
}

// Create singleton instance
let apiClientInstance: OptimizedApiClient | null = null;

export function getOptimizedApiClient(): OptimizedApiClient {
  if (!apiClientInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    apiClientInstance = new OptimizedApiClient(supabaseUrl, supabaseKey, {
      enableDeduplication: true,
      enableCaching: true,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxConcurrentRequests: 10,
    });
  }
  
  return apiClientInstance;
} 