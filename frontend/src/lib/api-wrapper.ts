import { NextRequest, NextResponse } from 'next/server';

export type ApiHandler = (request: NextRequest) => Promise<NextResponse> | NextResponse;

// Default timeout in milliseconds (30 seconds)
const DEFAULT_TIMEOUT = 30000;

export function withApiHandler(handler: ApiHandler, options?: { timeout?: number }) {
  return async (request: NextRequest) => {
    const startTime = Date.now();
    const timeout = options?.timeout || DEFAULT_TIMEOUT;
    
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<NextResponse>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`API route timeout after ${timeout}ms`));
        }, timeout);
      });
      
      // Race between the handler and timeout
      const response = await Promise.race([
        handler(request),
        timeoutPromise,
      ]);
      
      // Add performance headers
      const duration = Date.now() - startTime;
      response.headers.set('X-Response-Time', `${duration}ms`);
      
      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[API Error] ${request.method} ${request.url} - ${error.message} (${duration}ms)`);
      
      // Check if it's a timeout error
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timeout', message: 'The request took too long to process' },
          { status: 504 }
        );
      }
      
      // Generic error response
      return NextResponse.json(
        { error: 'Internal server error', message: error.message || 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  };
}

// Helper to create consistent error responses
export function createErrorResponse(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

// Helper to create consistent success responses
export function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
} 