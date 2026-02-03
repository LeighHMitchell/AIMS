/**
 * Request Priority Queue
 *
 * A singleton that manages API requests with priority levels.
 * HIGH priority requests (saves) can cancel LOW priority requests (reads).
 * Limits concurrent requests to prevent server overload.
 */

export type RequestPriority = 'HIGH' | 'LOW';

interface QueuedRequest {
  id: string;
  priority: RequestPriority;
  abortController: AbortController;
  promise: Promise<Response>;
  startTime: number;
}

interface RequestQueueOptions {
  maxConcurrent?: number;
  debug?: boolean;
}

class RequestQueue {
  private activeRequests: Map<string, QueuedRequest> = new Map();
  private maxConcurrent: number;
  private debug: boolean;
  private pendingQueue: Array<{
    id: string;
    priority: RequestPriority;
    fetchFn: (signal: AbortSignal) => Promise<Response>;
    resolve: (value: Response | PromiseLike<Response>) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor(options: RequestQueueOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 6; // Default browser limit
    this.debug = options.debug ?? false;
  }

  private log(...args: any[]) {
    if (this.debug) {
      console.log('[RequestQueue]', ...args);
    }
  }

  /**
   * Enqueue a request with a given priority
   */
  async enqueue(
    id: string,
    priority: RequestPriority,
    fetchFn: (signal: AbortSignal) => Promise<Response>
  ): Promise<Response> {
    this.log(`Enqueueing request: ${id} (${priority})`);

    // If this exact request is already in progress, cancel the old one
    if (this.activeRequests.has(id)) {
      this.log(`Request ${id} already in progress, cancelling old request`);
      this.cancel(id);
    }

    // If HIGH priority, cancel all LOW priority requests
    if (priority === 'HIGH') {
      this.cancelLowPriority();
    }

    // If we're at max concurrent, queue the request or cancel lowest priority
    if (this.activeRequests.size >= this.maxConcurrent) {
      if (priority === 'HIGH') {
        // Cancel the oldest LOW priority request to make room
        const lowPriorityRequest = this.findOldestLowPriority();
        if (lowPriorityRequest) {
          this.log(`Cancelling oldest LOW priority request to make room: ${lowPriorityRequest.id}`);
          this.cancel(lowPriorityRequest.id);
        } else {
          // All active requests are HIGH priority, wait in queue
          return this.waitInQueue(id, priority, fetchFn);
        }
      } else {
        // LOW priority request, wait in queue
        return this.waitInQueue(id, priority, fetchFn);
      }
    }

    return this.executeRequest(id, priority, fetchFn);
  }

  private async executeRequest(
    id: string,
    priority: RequestPriority,
    fetchFn: (signal: AbortSignal) => Promise<Response>
  ): Promise<Response> {
    const abortController = new AbortController();

    const promise = fetchFn(abortController.signal);

    const queuedRequest: QueuedRequest = {
      id,
      priority,
      abortController,
      promise,
      startTime: Date.now()
    };

    this.activeRequests.set(id, queuedRequest);
    this.log(`Started request: ${id} (${priority}), active: ${this.activeRequests.size}`);

    try {
      const response = await promise;
      this.log(`Completed request: ${id}`);
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.log(`Request aborted: ${id}`);
      }
      throw error;
    } finally {
      this.activeRequests.delete(id);
      this.processQueue();
    }
  }

  private waitInQueue(
    id: string,
    priority: RequestPriority,
    fetchFn: (signal: AbortSignal) => Promise<Response>
  ): Promise<Response> {
    this.log(`Queueing request: ${id} (${priority})`);

    return new Promise((resolve, reject) => {
      // Insert based on priority - HIGH priority goes to front
      if (priority === 'HIGH') {
        this.pendingQueue.unshift({ id, priority, fetchFn, resolve, reject });
      } else {
        this.pendingQueue.push({ id, priority, fetchFn, resolve, reject });
      }
    });
  }

  private processQueue() {
    if (this.pendingQueue.length === 0) return;
    if (this.activeRequests.size >= this.maxConcurrent) return;

    const next = this.pendingQueue.shift();
    if (!next) return;

    this.log(`Processing queued request: ${next.id}`);

    this.executeRequest(next.id, next.priority, next.fetchFn)
      .then(next.resolve)
      .catch(next.reject);
  }

  private findOldestLowPriority(): QueuedRequest | null {
    let oldest: QueuedRequest | null = null;

    Array.from(this.activeRequests.values()).forEach(request => {
      if (request.priority === 'LOW') {
        if (!oldest || request.startTime < oldest.startTime) {
          oldest = request;
        }
      }
    });

    return oldest;
  }

  /**
   * Cancel all LOW priority requests
   * Call this before making save requests
   */
  cancelLowPriority(): void {
    const toCancel: string[] = [];

    Array.from(this.activeRequests.entries()).forEach(([id, request]) => {
      if (request.priority === 'LOW') {
        toCancel.push(id);
      }
    });

    // Also remove LOW priority items from pending queue
    this.pendingQueue = this.pendingQueue.filter(item => item.priority !== 'LOW');

    if (toCancel.length > 0) {
      this.log(`Cancelling ${toCancel.length} LOW priority requests`);
    }

    toCancel.forEach(id => {
      this.cancel(id);
    });
  }

  /**
   * Cancel a specific request by ID
   */
  cancel(id: string): void {
    const request = this.activeRequests.get(id);
    if (request) {
      this.log(`Cancelling request: ${id}`);
      request.abortController.abort();
      this.activeRequests.delete(id);
    }

    // Also remove from pending queue
    this.pendingQueue = this.pendingQueue.filter(item => item.id !== id);
  }

  /**
   * Cancel all requests
   */
  cancelAll(): void {
    this.log('Cancelling all requests');

    Array.from(this.activeRequests.values()).forEach(request => {
      request.abortController.abort();
    });

    this.activeRequests.clear();
    this.pendingQueue = [];
  }

  /**
   * Get the number of active requests
   */
  getActiveCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Get the number of pending requests
   */
  getPendingCount(): number {
    return this.pendingQueue.length;
  }

  /**
   * Check if a specific request is active
   */
  isActive(id: string): boolean {
    return this.activeRequests.has(id);
  }

  /**
   * Enable/disable debug logging
   */
  setDebug(enabled: boolean): void {
    this.debug = enabled;
  }
}

// Export a singleton instance
export const requestQueue = new RequestQueue({
  maxConcurrent: 6,
  debug: process.env.NODE_ENV === 'development'
});

// Also export the class for testing
export { RequestQueue };
